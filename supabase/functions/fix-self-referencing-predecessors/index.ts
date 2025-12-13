import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId } = await req.json() as { projectId: string };

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: 'Project ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔧 Fixing self-referencing predecessors for project ${projectId}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all tasks for this project
    const { data: tasks, error: fetchError } = await supabase
      .from('project_schedule_tasks')
      .select('id, hierarchy_number, predecessor')
      .eq('project_id', projectId);

    if (fetchError) {
      console.error('❌ Failed to fetch tasks:', fetchError);
      throw fetchError;
    }

    if (!tasks || tasks.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No tasks found', fixed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find tasks with self-referencing predecessors
    const tasksToFix: { id: string; hierarchy: string; currentPred: string; newPred: string }[] = [];
    
    for (const task of tasks) {
      if (!task.predecessor) continue;
      
      const predecessors = Array.isArray(task.predecessor) 
        ? task.predecessor 
        : typeof task.predecessor === 'string' 
          ? JSON.parse(task.predecessor) 
          : [];
      
      for (const pred of predecessors) {
        // Extract task ID from predecessor string (e.g., "4.21" or "4.21FS+2")
        const predMatch = pred.match(/^([\d.]+)/);
        if (predMatch && predMatch[1] === task.hierarchy_number) {
          // Self-reference found! Calculate correct predecessor
          const parts = task.hierarchy_number.split('.');
          if (parts.length === 2) {
            const parent = parts[0];
            const child = parseInt(parts[1]);
            if (child > 1) {
              const correctPred = `${parent}.${child - 1}`;
              tasksToFix.push({
                id: task.id,
                hierarchy: task.hierarchy_number,
                currentPred: pred,
                newPred: correctPred
              });
            }
          }
          break;
        }
      }
    }

    console.log(`📋 Found ${tasksToFix.length} tasks with self-referencing predecessors`);

    // Fix each task
    let fixedCount = 0;
    const fixes: { hierarchy: string; from: string; to: string }[] = [];

    for (const fix of tasksToFix) {
      const { error: updateError } = await supabase
        .from('project_schedule_tasks')
        .update({ 
          predecessor: [fix.newPred],
          updated_at: new Date().toISOString()
        })
        .eq('id', fix.id);

      if (updateError) {
        console.error(`❌ Failed to fix task ${fix.hierarchy}:`, updateError);
      } else {
        fixedCount++;
        fixes.push({ hierarchy: fix.hierarchy, from: fix.currentPred, to: fix.newPred });
        console.log(`✅ Fixed ${fix.hierarchy}: ${fix.currentPred} → ${fix.newPred}`);
      }
    }

    console.log(`✅ Fixed ${fixedCount} self-referencing predecessors`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        fixed: fixedCount,
        fixes
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Fix function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
