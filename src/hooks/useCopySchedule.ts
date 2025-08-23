import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ProjectTask } from "@/hooks/useProjectTasks";
import { CopyScheduleOptions } from "@/components/schedule/CopyScheduleDialog";
import { addDays } from "@/utils/dateOnly";

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
      const { sourceProjectId, projectStartDate, removeAllResources, restartAllStartDates } = options;

      // Delete existing tasks first (always replace mode now)
      const { error: deleteError } = await supabase
        .from('project_schedule_tasks')
        .delete()
        .eq('project_id', targetProjectId);

      if (deleteError) throw deleteError;

      // Calculate date shift based on options
      let shiftDays = 0;
      let targetDate: Date;

      if (restartAllStartDates) {
        // Use January 1st of current year
        targetDate = new Date(new Date().getFullYear(), 0, 1);
      } else {
        // Use the selected project start date
        targetDate = projectStartDate;
      }

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
      const tasksToInsert = sourceTasks.map((task, index) => {
        let newStartDate = task.start_date;
        let newEndDate = task.end_date;

        if (restartAllStartDates) {
          // Set ALL tasks to start on 01/01/current year - no logic, just set the date
          const restartDate = new Date(Date.UTC(new Date().getFullYear(), 0, 1)); // 01/01/current year at UTC midnight
          const duration = task.duration || 1;
          const endDate = new Date(restartDate.getTime() + (duration * 24 * 60 * 60 * 1000));
          
          newStartDate = restartDate.toISOString();
          newEndDate = endDate.toISOString();
        } else {
          // Apply date shift based on project start date
          if (shiftDays !== 0) {
            // Convert ISO dates to YYYY-MM-DD format for dateOnly utils
            const startDateStr = task.start_date.split('T')[0];
            const endDateStr = task.end_date.split('T')[0];
            newStartDate = new Date(addDays(startDateStr, shiftDays)).toISOString();
            newEndDate = new Date(addDays(endDateStr, shiftDays)).toISOString();
          }
        }

        return {
          project_id: targetProjectId,
          task_name: task.task_name,
          start_date: newStartDate,
          end_date: newEndDate,
          duration: task.duration,
          progress: 0, // Reset progress for copied tasks
          predecessor: task.predecessor,
          resources: removeAllResources ? null : task.resources, // Remove resources if requested
          hierarchy_number: task.hierarchy_number,
          confirmed: false // Reset confirmation status
        };
      });

      // Insert all tasks in a single batch
      const { error: insertError } = await supabase
        .from('project_schedule_tasks')
        .insert(tasksToInsert);

      if (insertError) throw insertError;

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