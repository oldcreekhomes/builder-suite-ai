import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RepairMapping {
  id: string;
  newHierarchy: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, deleteOrphans } = await req.json() as { 
      projectId: string;
      deleteOrphans?: boolean;
    };

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: 'Project ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔧 Starting schedule repair for project ${projectId}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all tasks with TEMP hierarchy numbers
    const { data: tempTasks, error: fetchError } = await supabase
      .from('project_schedule_tasks')
      .select('id, task_name, hierarchy_number, predecessor')
      .eq('project_id', projectId)
      .like('hierarchy_number', '__TEMP_%');

    if (fetchError) {
      console.error('❌ Failed to fetch TEMP tasks:', fetchError);
      throw fetchError;
    }

    if (!tempTasks || tempTasks.length === 0) {
      console.log('✅ No corrupted tasks found');
      return new Response(
        JSON.stringify({ success: true, message: 'No corrupted tasks found', repaired: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Found ${tempTasks.length} tasks with TEMP hierarchy numbers`);

    // Get all normal tasks to find available hierarchy slots
    const { data: allTasks, error: allError } = await supabase
      .from('project_schedule_tasks')
      .select('id, task_name, hierarchy_number')
      .eq('project_id', projectId)
      .not('hierarchy_number', 'like', '__TEMP_%')
      .order('hierarchy_number');

    if (allError) throw allError;

    // Build a set of used hierarchy numbers
    const usedHierarchies = new Set(allTasks?.map(t => t.hierarchy_number) || []);

    // Identify orphan "New Task" entries (delete if requested)
    const orphans = tempTasks.filter(t => t.task_name === 'New Task');
    const tasksToRepair = tempTasks.filter(t => t.task_name !== 'New Task');

    if (deleteOrphans && orphans.length > 0) {
      console.log(`🗑️ Deleting ${orphans.length} orphan "New Task" entries`);
      const { error: deleteError } = await supabase
        .from('project_schedule_tasks')
        .delete()
        .in('id', orphans.map(o => o.id));

      if (deleteError) {
        console.error('❌ Failed to delete orphans:', deleteError);
      } else {
        console.log('✅ Orphans deleted');
      }
    }

    // Repair mapping - assign sequential hierarchy numbers
    const repairs: RepairMapping[] = [];
    
    // Find the highest top-level number
    const topLevelNumbers = Array.from(usedHierarchies)
      .filter(h => /^\d+$/.test(h))
      .map(h => parseInt(h));
    let nextTopLevel = Math.max(...topLevelNumbers, 0) + 1;

    // Find gaps in 7.X sequence (common construction tasks)
    const level7Numbers = Array.from(usedHierarchies)
      .filter(h => /^7\.\d+$/.test(h))
      .map(h => parseInt(h.split('.')[1]))
      .sort((a, b) => a - b);
    
    let nextLevel7 = level7Numbers.length > 0 ? Math.max(...level7Numbers) + 1 : 1;

    for (const task of tasksToRepair) {
      // Determine if this is a top-level task or a child
      const isTopLevel = task.task_name.toUpperCase() === task.task_name && 
                        !task.task_name.includes(' ') || 
                        ['EXTERIOR CONSTRUCTION', 'INTERIOR CONSTRUCTION', 'Certificate of Occupancy'].some(
                          n => task.task_name.includes(n) || n.includes(task.task_name)
                        );

      if (isTopLevel) {
        repairs.push({ id: task.id, newHierarchy: String(nextTopLevel) });
        nextTopLevel++;
      } else {
        // Assign as 7.X child
        repairs.push({ id: task.id, newHierarchy: `7.${nextLevel7}` });
        nextLevel7++;
      }
    }

    console.log(`🔄 Applying ${repairs.length} hierarchy repairs`);

    // Apply repairs
    for (const repair of repairs) {
      const { error: updateError } = await supabase
        .from('project_schedule_tasks')
        .update({ 
          hierarchy_number: repair.newHierarchy,
          updated_at: new Date().toISOString()
        })
        .eq('id', repair.id);

      if (updateError) {
        console.error(`❌ Failed to repair task ${repair.id}:`, updateError);
      }
    }

    console.log(`✅ Schedule repair completed: ${repairs.length} tasks repaired`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        repaired: repairs.length,
        deleted: deleteOrphans ? orphans.length : 0,
        repairs: repairs.map(r => ({ id: r.id, hierarchy: r.newHierarchy }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Repair function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
