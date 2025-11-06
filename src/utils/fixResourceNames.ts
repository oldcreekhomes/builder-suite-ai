import { supabase } from "@/integrations/supabase/client";

/**
 * One-time utility to fix duplicate resource names in schedule tasks
 * Replaces "Dick Irvin" with "Dick Irwin" in all task resources
 */
export async function fixDuplicateResourceNames() {
  console.log("Starting resource name cleanup...");
  
  try {
    // Fetch all tasks that contain "Dick Irvin" in resources
    const { data: tasks, error: fetchError } = await supabase
      .from('project_schedule_tasks')
      .select('id, resources')
      .like('resources', '%Dick Irvin%');

    if (fetchError) {
      console.error("Error fetching tasks:", fetchError);
      return { success: false, error: fetchError };
    }

    if (!tasks || tasks.length === 0) {
      console.log("No tasks found with 'Dick Irvin' in resources");
      return { success: true, updatedCount: 0 };
    }

    console.log(`Found ${tasks.length} tasks to update`);

    // Update each task by replacing the old name with the new name
    const updates = tasks.map(task => {
      let updatedResources = task.resources || '';
      
      // First replace the duplicate "Dick Irvin, Dick Irwin" with just "Dick Irwin"
      updatedResources = updatedResources.replace(/Dick Irvin,\s*Dick Irwin/g, 'Dick Irwin');
      
      // Then replace any remaining "Dick Irvin" with "Dick Irwin"
      updatedResources = updatedResources.replace(/Dick Irvin/g, 'Dick Irwin');

      return supabase
        .from('project_schedule_tasks')
        .update({ resources: updatedResources })
        .eq('id', task.id);
    });

    // Execute all updates
    const results = await Promise.all(updates);
    
    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      console.error("Some updates failed:", errors);
      return { success: false, error: errors[0].error, updatedCount: results.length - errors.length };
    }

    console.log(`Successfully updated ${tasks.length} tasks`);
    return { success: true, updatedCount: tasks.length };

  } catch (error) {
    console.error("Unexpected error during cleanup:", error);
    return { success: false, error };
  }
}
