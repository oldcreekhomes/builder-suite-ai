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

    console.log(`📦 Atomic bulk update: ${updates.length} tasks for project ${projectId}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const startTime = Date.now();

    // Use atomic RPC function — single transaction, automatic rollback on failure
    const { data, error } = await supabase.rpc('bulk_update_hierarchy_numbers', {
      updates: updates as unknown
    });

    if (error) {
      console.error('❌ Atomic bulk update failed:', error);
      throw error;
    }

    const totalTime = Date.now() - startTime;
    console.log(`✅ Atomic update completed: ${data}/${updates.length} tasks in ${totalTime}ms`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        updated: data,
        total: updates.length,
        elapsed_ms: totalTime
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
