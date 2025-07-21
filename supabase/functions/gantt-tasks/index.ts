import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url)
    const projectId = url.searchParams.get('projectId')

    if (req.method === 'GET') {
      // Fetch tasks for project
      if (!projectId) {
        return new Response(
          JSON.stringify({ error: 'Project ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data, error } = await supabase.rpc('get_gantt_tasks_for_project', {
        project_id_param: projectId
      })

      if (error) {
        console.error('Error fetching tasks:', error)
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Transform data for Syncfusion format
      const transformedData = data.map((task: any, index: number) => ({
        TaskID: index + 1, // Syncfusion needs numeric IDs
        TaskName: task.task_name,
        StartDate: new Date(task.start_date),
        EndDate: new Date(task.end_date),
        Duration: task.duration,
        Progress: task.progress || 0,
        Resources: task.assigned_to ? [task.assigned_to] : [],
        Predecessor: task.predecessor || '',
        ParentID: task.parent_id ? parseInt(task.parent_id) : null,
        subtasks: [],
        // Keep original UUID for updates
        OriginalID: task.id
      }))

      return new Response(
        JSON.stringify(transformedData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'POST') {
      // Create new task
      const body = await req.json()
      
      if (!projectId) {
        return new Response(
          JSON.stringify({ error: 'Project ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data, error } = await supabase.rpc('insert_gantt_task', {
        project_id_param: projectId,
        task_name_param: body.TaskName,
        start_date_param: body.StartDate,
        end_date_param: body.EndDate,
        duration_param: body.Duration || 1,
        progress_param: body.Progress || 0,
        assigned_to_param: Array.isArray(body.Resources) ? body.Resources.join(',') : body.Resources,
        predecessor_param: body.Predecessor || '',
        parent_id_param: body.ParentID ? body.ParentID.toString() : null,
        order_index_param: body.TaskID || 0,
        color_param: '#3b82f6'
      })

      if (error) {
        console.error('Error creating task:', error)
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true, id: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'PUT') {
      // Update task
      const body = await req.json()
      const taskId = body.OriginalID

      if (!taskId) {
        return new Response(
          JSON.stringify({ error: 'Task ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data, error } = await supabase.rpc('update_gantt_task', {
        task_id_param: taskId,
        task_name_param: body.TaskName,
        start_date_param: body.StartDate,
        end_date_param: body.EndDate,
        duration_param: body.Duration,
        progress_param: body.Progress,
        assigned_to_param: Array.isArray(body.Resources) ? body.Resources.join(',') : body.Resources,
        predecessor_param: body.Predecessor,
        parent_id_param: body.ParentID ? body.ParentID.toString() : null,
        order_index_param: body.TaskID,
        color_param: body.Color || '#3b82f6'
      })

      if (error) {
        console.error('Error updating task:', error)
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'DELETE') {
      const body = await req.json()
      const taskId = body.OriginalID

      if (!taskId) {
        return new Response(
          JSON.stringify({ error: 'Task ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data, error } = await supabase.rpc('delete_gantt_task', {
        task_id_param: taskId
      })

      if (error) {
        console.error('Error deleting task:', error)
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
