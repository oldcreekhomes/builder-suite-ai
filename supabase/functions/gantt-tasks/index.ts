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

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: 'Project ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // All operations come as POST requests with Syncfusion's UrlAdaptor
    if (req.method === 'POST') {
      const body = await req.json()
      console.log('Received request body:', JSON.stringify(body, null, 2))

      // Handle different Syncfusion operations
      const action = body.action || body.requestType || 'read'
      console.log('Operation type:', action)

      switch (action) {
        case 'read':
        case undefined: // Default read operation
          // Fetch tasks for project
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

          console.log('Returning transformed data:', transformedData)

          // Return in Syncfusion's expected format
          return new Response(
            JSON.stringify({
              result: transformedData,
              count: transformedData.length
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )

        case 'insert':
        case 'add':
          // Create new task
          const addedRecords = body.added || [body.value]
          const newTask = addedRecords[0]
          
          const { data: insertData, error: insertError } = await supabase.rpc('insert_gantt_task', {
            project_id_param: projectId,
            task_name_param: newTask.TaskName,
            start_date_param: newTask.StartDate,
            end_date_param: newTask.EndDate,
            duration_param: newTask.Duration || 1,
            progress_param: newTask.Progress || 0,
            assigned_to_param: Array.isArray(newTask.Resources) ? newTask.Resources.join(',') : newTask.Resources,
            predecessor_param: newTask.Predecessor || '',
            parent_id_param: newTask.ParentID ? newTask.ParentID.toString() : null,
            order_index_param: newTask.TaskID || 0,
            color_param: '#3b82f6'
          })

          if (insertError) {
            console.error('Error creating task:', insertError)
            return new Response(
              JSON.stringify({ error: insertError.message }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          return new Response(
            JSON.stringify({ 
              result: [{ ...newTask, OriginalID: insertData }],
              count: 1 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )

        case 'update':
        case 'edit':
          // Update task
          const changedRecords = body.changed || [body.value]
          const updatedTask = changedRecords[0]
          const taskId = updatedTask.OriginalID

          if (!taskId) {
            return new Response(
              JSON.stringify({ error: 'Task ID is required for update' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          const { data: updateData, error: updateError } = await supabase.rpc('update_gantt_task', {
            task_id_param: taskId,
            task_name_param: updatedTask.TaskName,
            start_date_param: updatedTask.StartDate,
            end_date_param: updatedTask.EndDate,
            duration_param: updatedTask.Duration,
            progress_param: updatedTask.Progress,
            assigned_to_param: Array.isArray(updatedTask.Resources) ? updatedTask.Resources.join(',') : updatedTask.Resources,
            predecessor_param: updatedTask.Predecessor,
            parent_id_param: updatedTask.ParentID ? updatedTask.ParentID.toString() : null,
            order_index_param: updatedTask.TaskID,
            color_param: updatedTask.Color || '#3b82f6'
          })

          if (updateError) {
            console.error('Error updating task:', updateError)
            return new Response(
              JSON.stringify({ error: updateError.message }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          return new Response(
            JSON.stringify({ 
              result: [updatedTask],
              count: 1 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )

        case 'remove':
        case 'delete':
          // Delete task
          const deletedRecords = body.deleted || [body.value]
          const taskToDelete = deletedRecords[0]
          const deleteTaskId = taskToDelete.OriginalID

          if (!deleteTaskId) {
            return new Response(
              JSON.stringify({ error: 'Task ID is required for deletion' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          const { data: deleteData, error: deleteError } = await supabase.rpc('delete_gantt_task', {
            task_id_param: deleteTaskId
          })

          if (deleteError) {
            console.error('Error deleting task:', deleteError)
            return new Response(
              JSON.stringify({ error: deleteError.message }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          return new Response(
            JSON.stringify({ 
              result: [taskToDelete],
              count: 1 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )

        default:
          console.log('Unknown action:', action, 'Body:', body)
          return new Response(
            JSON.stringify({ error: `Unknown action: ${action}` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
      }
    }

    if (req.method === 'GET') {
      // Simple GET request for initial data fetch
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
        TaskID: index + 1,
        TaskName: task.task_name,
        StartDate: new Date(task.start_date),
        EndDate: new Date(task.end_date),
        Duration: task.duration,
        Progress: task.progress || 0,
        Resources: task.assigned_to ? [task.assigned_to] : [],
        Predecessor: task.predecessor || '',
        ParentID: task.parent_id ? parseInt(task.parent_id) : null,
        subtasks: [],
        OriginalID: task.id
      }))

      return new Response(
        JSON.stringify({
          result: transformedData,
          count: transformedData.length
        }),
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
