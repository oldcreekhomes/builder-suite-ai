import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DisplayOrderUpdate {
  id: string;
  display_order: number;
}

export function useProjectDisplayOrder() {
  const queryClient = useQueryClient();

  const updateDisplayOrder = useMutation({
    mutationFn: async (updates: DisplayOrderUpdate[]) => {
      // Update each project's display_order
      const promises = updates.map(({ id, display_order }) =>
        supabase
          .from("projects")
          .update({ display_order })
          .eq("id", id)
      );

      const results = await Promise.all(promises);
      
      // Check for errors
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        throw new Error(errors[0].error?.message || "Failed to update display order");
      }

      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (error) => {
      console.error("Failed to update display order:", error);
      toast.error("Failed to save job order");
    },
  });

  return { updateDisplayOrder };
}
