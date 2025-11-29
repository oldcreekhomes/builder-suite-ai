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

    console.log(`📦 Two-phase bulk update: ${updates.length} tasks for project ${projectId}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const startTime = Date.now();

    // ============================================
    // PHASE 1: Clear all to temporary unique values
    // This frees up all real hierarchy numbers
    // ============================================
    console.log('🔄 Phase 1: Setting temporary hierarchy values...');
    
    const phase1Promises = updates.map((update, index) => 
      supabase
        .from('project_schedule_tasks')
        .update({ hierarchy_number: `__TEMP_${index}__` })
        .eq('id', update.id)
        .eq('project_id', projectId)
    );
    
    const phase1Results = await Promise.all(phase1Promises);
    
    // Check for Phase 1 errors
    const phase1Error = phase1Results.find(r => r.error);
    if (phase1Error?.error) {
      console.error('❌ Phase 1 failed:', phase1Error.error);
      throw phase1Error.error;
    }
    
    const phase1Time = Date.now() - startTime;
    console.log(`✅ Phase 1 completed in ${phase1Time}ms`);

    // ============================================
    // PHASE 2: Set final hierarchy values
    // No conflicts since all real values are now free
    // ============================================
    console.log('🔄 Phase 2: Setting final hierarchy values...');
    
    const phase2Start = Date.now();
    const phase2Promises = updates.map(update => 
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
    
    const phase2Results = await Promise.all(phase2Promises);
    
    // Check for Phase 2 errors
    const phase2Error = phase2Results.find(r => r.error);
    if (phase2Error?.error) {
      console.error('❌ Phase 2 failed:', phase2Error.error);
      throw phase2Error.error;
    }

    const successCount = phase2Results.filter(r => r.data && r.data.length > 0).length;
    const totalTime = Date.now() - startTime;
    const phase2Time = Date.now() - phase2Start;
    
    console.log(`✅ Phase 2 completed in ${phase2Time}ms`);
    console.log(`✅ Two-phase update completed: ${successCount}/${updates.length} tasks in ${totalTime}ms`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        updated: successCount,
        total: updates.length,
        elapsed_ms: totalTime,
        phase1_ms: phase1Time,
        phase2_ms: phase2Time
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
