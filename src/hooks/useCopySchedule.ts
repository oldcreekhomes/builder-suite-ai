import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ProjectTask } from "@/hooks/useProjectTasks";
import { CopyScheduleOptions } from "@/components/schedule/CopyScheduleDialog";
import { addDays, ensureBusinessDay, addBusinessDays, getBusinessDaysBetween } from "@/utils/dateOnly";

interface CopyScheduleParams {
  targetProjectId: string;
  options: CopyScheduleOptions;
  sourceTasks: ProjectTask[];
}

export function useCopySchedule() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ targetProjectId, options, sourceTasks }: CopyScheduleParams) => {
      const { sourceProjectId, projectStartDate, removeAllResources } = options;

      // Delete existing tasks first (always replace mode now)
      const { error: deleteError } = await supabase
        .from('project_schedule_tasks')
        .delete()
        .eq('project_id', targetProjectId);

      if (deleteError) throw deleteError;

      // Calculate date shift based on project start date
      let shiftDays = 0;
      const targetDate = projectStartDate;

      if (sourceTasks.length > 0) {
        // Find the earliest start date in source tasks
        const earliestDate = sourceTasks.reduce((earliest, task) => {
          const taskDate = new Date(task.start_date);
          return taskDate < earliest ? taskDate : earliest;
        }, new Date(sourceTasks[0].start_date));

        // Calculate shift in days
        const targetStartTime = targetDate.getTime();
        const sourceStartTime = earliestDate.getTime();
        shiftDays = Math.round((targetStartTime - sourceStartTime) / (1000 * 60 * 60 * 24));
      }

      // Process and copy tasks
      const tasksToInsert = sourceTasks.map((task) => {
        let newStartDate = task.start_date;
        let newEndDate = task.end_date;

        // Apply date shift based on project start date
        if (shiftDays !== 0) {
          const startDateStr = task.start_date.split('T')[0];
          const endDateStr = task.end_date.split('T')[0];
          
          // Shift by calendar days first
          let shiftedStart = addDays(startDateStr, shiftDays);
          let shiftedEnd = addDays(endDateStr, shiftDays);
          
          // CRITICAL: Ensure dates land on business days (Monday-Friday)
          shiftedStart = ensureBusinessDay(shiftedStart);
          shiftedEnd = ensureBusinessDay(shiftedEnd);
          
          // Ensure end date is not before start date after adjustment
          if (shiftedEnd < shiftedStart) {
            shiftedEnd = shiftedStart;
          }
          
          newStartDate = shiftedStart + 'T00:00:00+00:00';
          newEndDate = shiftedEnd + 'T00:00:00+00:00';
        }

        return {
          project_id: targetProjectId,
          task_name: task.task_name,
          start_date: newStartDate,
          end_date: newEndDate,
          duration: task.duration,
          progress: 0,
          predecessor: task.predecessor,
          resources: removeAllResources ? null : task.resources,
          hierarchy_number: task.hierarchy_number,
          confirmed: null
        };
      });

      // Insert all tasks in a single batch
      const { data: insertedTasks, error: insertError } = await supabase
        .from('project_schedule_tasks')
        .insert(tasksToInsert)
        .select();

      if (insertError) throw insertError;

      // CRITICAL: Recalculate dates for tasks with predecessors
      // This ensures tasks respect their dependency relationships after the shift
      if (insertedTasks && insertedTasks.length > 0) {
        const tasksWithPredecessors = insertedTasks.filter(t => t.predecessor && Array.isArray(t.predecessor) && t.predecessor.length > 0);
        
        for (const task of tasksWithPredecessors) {
          // Find the predecessor task
          const predecessorStr = task.predecessor[0];
          if (!predecessorStr) continue;
          
          // Parse predecessor string (e.g., "1.6" or "1.6FS" or "1.6SF")
          const match = predecessorStr.match(/^([\d.]+)/);
          if (!match) continue;
          
          const predecessorHierarchy = match[1];
          const predecessorTask = insertedTasks.find(t => t.hierarchy_number === predecessorHierarchy);
          if (!predecessorTask || !predecessorTask.end_date) continue;
          
          // Calculate new start date (next business day after predecessor ends)
          const predEndDate = predecessorTask.end_date.split('T')[0];
          const newStartDate = addBusinessDays(predEndDate, 1);
          
          // Calculate new end date based on duration
          const duration = task.duration || 1;
          const newEndDate = duration > 1 
            ? addBusinessDays(newStartDate, duration - 1) 
            : newStartDate;
          
          // Update the task with corrected dates
          await supabase
            .from('project_schedule_tasks')
            .update({
              start_date: newStartDate + 'T00:00:00+00:00',
              end_date: newEndDate + 'T00:00:00+00:00'
            })
            .eq('id', task.id);
        }
      }

      return tasksToInsert.length;
    },
    onSuccess: (copiedCount) => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks'] });
      toast({
        title: "Schedule Copied",
        description: `Successfully copied ${copiedCount} tasks.`,
      });
    },
    onError: (error) => {
      console.error('Error copying schedule:', error);
      toast({
        title: "Error",
        description: "Failed to copy schedule. Please try again.",
        variant: "destructive",
      });
    }
  });
}