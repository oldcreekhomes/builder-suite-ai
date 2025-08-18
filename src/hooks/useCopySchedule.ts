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
      const { sourceProjectId, mode, shiftDays } = options;

      // If replacing, delete existing tasks first
      if (mode === 'replace') {
        const { error: deleteError } = await supabase
          .from('project_schedule_tasks')
          .delete()
          .eq('project_id', targetProjectId);

        if (deleteError) throw deleteError;
      }

      // Get existing task count for append mode hierarchy numbering
      let hierarchyOffset = 0;
      if (mode === 'append') {
        const { data: existingTasks } = await supabase
          .from('project_schedule_tasks')
          .select('hierarchy_number')
          .eq('project_id', targetProjectId);

        if (existingTasks && existingTasks.length > 0) {
          // Find the highest top-level hierarchy number
          const topLevelNumbers = existingTasks
            .filter(task => task.hierarchy_number && !task.hierarchy_number.includes('.'))
            .map(task => parseInt(task.hierarchy_number || '0'))
            .filter(num => !isNaN(num));
          
          hierarchyOffset = topLevelNumbers.length > 0 ? Math.max(...topLevelNumbers) : 0;
        }
      }

      // Process and copy tasks
      const tasksToInsert = sourceTasks.map(task => {
        let newStartDate = task.start_date;
        let newEndDate = task.end_date;

        // Apply date shift if specified
        if (shiftDays && shiftDays !== 0) {
          // Convert ISO dates to YYYY-MM-DD format for dateOnly utils
          const startDateStr = task.start_date.split('T')[0];
          const endDateStr = task.end_date.split('T')[0];
          newStartDate = new Date(addDays(startDateStr, shiftDays)).toISOString();
          newEndDate = new Date(addDays(endDateStr, shiftDays)).toISOString();
        }

        // Adjust hierarchy numbers for append mode
        let newHierarchyNumber = task.hierarchy_number;
        if (mode === 'append' && hierarchyOffset > 0 && task.hierarchy_number) {
          const hierarchyParts = task.hierarchy_number.split('.');
          if (hierarchyParts.length > 0) {
            const topLevel = parseInt(hierarchyParts[0]) + hierarchyOffset;
            hierarchyParts[0] = topLevel.toString();
            newHierarchyNumber = hierarchyParts.join('.');
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
          resources: task.resources,
          hierarchy_number: newHierarchyNumber,
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