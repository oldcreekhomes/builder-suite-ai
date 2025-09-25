import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useClearSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase
        .from('project_schedule_tasks')
        .delete()
        .eq('project_id', projectId);

      if (error) {
        console.error('Error clearing schedule:', error);
        throw error;
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks'] });
      toast.success("All tasks deleted successfully");
    },
    onError: (error: any) => {
      console.error('Failed to clear schedule:', error);
      toast.error("Failed to delete tasks. Please try again.");
    }
  });
};