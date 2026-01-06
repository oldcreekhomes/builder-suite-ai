import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { recalculateAllTaskDates } from "@/utils/scheduleRecalculation";
import { ProjectTask } from "@/hooks/useProjectTasks";

interface RecalculateParams {
  projectId: string;
  tasks: ProjectTask[];
}

export function useRecalculateSchedule() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const mutation = useMutation({
    mutationFn: async ({ projectId, tasks }: RecalculateParams) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }
      
      return recalculateAllTaskDates(projectId, tasks);
    },
    onSuccess: (result, variables) => {
      // Invalidate the tasks query to refresh the UI
      queryClient.invalidateQueries({ 
        queryKey: ['project-tasks', variables.projectId, user?.id] 
      });
      
      if (result.updatedCount > 0) {
        toast({
          title: "Schedule Recalculated",
          description: `Updated ${result.updatedCount} task${result.updatedCount === 1 ? '' : 's'} based on predecessors.`,
        });
      } else {
        toast({
          title: "Schedule Up to Date",
          description: "All task dates are already correctly calculated.",
        });
      }
      
      if (result.errors.length > 0) {
        console.error("Recalculation errors:", result.errors);
        toast({
          title: "Some Updates Failed",
          description: `${result.errors.length} task(s) could not be updated.`,
          variant: "destructive"
        });
      }
    },
    onError: (error) => {
      console.error("Recalculation failed:", error);
      toast({
        title: "Recalculation Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    }
  });
  
  return mutation;
}
