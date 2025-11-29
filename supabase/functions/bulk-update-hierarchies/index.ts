import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface HierarchyUpdate {
  id: string;
  hierarchy_number: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { updates, projectId } = await req.json() as { 
      updates: HierarchyUpdate[]; 
      projectId: string;
    };

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No updates provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: 'Project ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📦 Bulk updating ${updates.length} task hierarchies for project ${projectId}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build a single SQL CASE statement for atomic update
    // This executes as ONE database operation, avoiding race conditions
    const caseStatements = updates.map(u => 
      `WHEN id = '${u.id}'::uuid THEN '${u.hierarchy_number}'`
    ).join('\n        ');
    
    const taskIds = updates.map(u => `'${u.id}'::uuid`).join(', ');
    
    const sql = `
      UPDATE project_schedule_tasks 
      SET 
        hierarchy_number = CASE 
          ${caseStatements}
          ELSE hierarchy_number
        END,
        updated_at = NOW()
      WHERE id IN (${taskIds})
        AND project_id = '${projectId}'::uuid
      RETURNING id, hierarchy_number;
    `;

    console.log(`🔄 Executing atomic batch update SQL...`);
    
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    // If exec_sql doesn't exist, fall back to individual upserts in a transaction
    if (error && error.message?.includes('function') && error.message?.includes('does not exist')) {
      console.log('⚠️ exec_sql not available, using upsert fallback...');
      
      // Use upsert which is still atomic per-row but very fast
      const records = updates.map(u => ({
        id: u.id,
        hierarchy_number: u.hierarchy_number,
        updated_at: new Date().toISOString()
      }));
      
      const { data: upsertData, error: upsertError } = await supabase
        .from('project_schedule_tasks')
        .upsert(records, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        })
        .select('id, hierarchy_number');
      
      if (upsertError) {
        console.error('❌ Upsert failed:', upsertError);
        throw upsertError;
      }
      
      console.log(`✅ Upsert completed for ${updates.length} tasks`);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          updated: updates.length,
          method: 'upsert',
          data: upsertData 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (error) {
      console.error('❌ Batch update failed:', error);
      throw error;
    }

    console.log(`✅ Atomic batch update completed for ${updates.length} tasks`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        updated: updates.length,
        method: 'atomic_sql',
        data 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Edge function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
