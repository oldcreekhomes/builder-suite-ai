import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface DismissParams {
  bidId: string;
  type: "will_bid" | "submitted";
}

export function useDismissBidNotification() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bidId, type }: DismissParams) => {
      if (!user?.id) throw new Error("User not authenticated");

      const updateData =
        type === "will_bid"
          ? { will_bid_acknowledged_by: user.id }
          : { bid_acknowledged_by: user.id };

      const { error } = await supabase
        .from("project_bids")
        .update(updateData)
        .eq("id", bidId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pm-bid-notifications"] });
    },
    onError: (error) => {
      console.error("Failed to dismiss notification:", error);
      toast.error("Failed to dismiss notification");
    },
  });
}
