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

    const startTime = Date.now();

    // Use parallel updates - all sent simultaneously via Promise.all
    // This is atomic per-row and very fast (single round-trip for all promises)
    console.log('🔄 Executing parallel batch updates...');
    
    const updatePromises = updates.map(update => 
      supabase
        .from('project_schedule_tasks')
        .update({ 
          hierarchy_number: update.hierarchy_number,
          updated_at: new Date().toISOString()
        })
        .eq('id', update.id)
        .eq('project_id', projectId)
        .select('id')
    );
    
    const results = await Promise.all(updatePromises);
    
    // Check for any errors
    const errorResult = results.find(r => r.error);
    if (errorResult?.error) {
      console.error('❌ Batch update failed:', errorResult.error);
      throw errorResult.error;
    }

    const successCount = results.filter(r => r.data && r.data.length > 0).length;
    const elapsed = Date.now() - startTime;
    
    console.log(`✅ Parallel batch update completed: ${successCount}/${updates.length} tasks in ${elapsed}ms`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        updated: successCount,
        total: updates.length,
        elapsed_ms: elapsed
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
