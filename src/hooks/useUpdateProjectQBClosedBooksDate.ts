import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export const useUpdateProjectQBClosedBooksDate = () => {
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
        .update({ qb_closed_books_date: date } as any)
        .eq("id", projectId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({
        title: "Date updated",
        description: "Closed books date has been saved.",
      });
    },
    onError: (error) => {
      console.error("Error updating QB closed books date:", error);
      toast({
        title: "Error",
        description: "Failed to update closed books date.",
        variant: "destructive",
      });
    },
  });
};
