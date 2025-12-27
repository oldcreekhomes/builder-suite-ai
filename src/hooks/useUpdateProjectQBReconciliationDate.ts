import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export const useUpdateProjectQBReconciliationDate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      projectId, 
      date 
    }: { 
      projectId: string; 
      date: string | null;
    }) => {
      const { error } = await supabase
        .from("projects")
        .update({ qb_last_reconciliation_date: date })
        .eq("id", projectId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({
        title: "Date updated",
        description: "QuickBooks reconciliation date has been saved.",
      });
    },
    onError: (error) => {
      console.error("Error updating QB reconciliation date:", error);
      toast({
        title: "Error",
        description: "Failed to update reconciliation date.",
        variant: "destructive",
      });
    },
  });
};
