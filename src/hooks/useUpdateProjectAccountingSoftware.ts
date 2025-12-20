import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useUpdateProjectAccountingSoftware() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, accountingSoftware }: { projectId: string; accountingSoftware: string | null }) => {
      const { error } = await supabase
        .from("projects")
        .update({ accounting_software: accountingSoftware })
        .eq("id", projectId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (error) => {
      console.error("Error updating accounting software:", error);
      toast.error("Failed to update accounting software");
    },
  });
}
