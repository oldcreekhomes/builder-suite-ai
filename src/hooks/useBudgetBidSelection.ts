import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAllBiddingData } from './useBiddingData';
import { useToast } from '@/hooks/use-toast';

export function useBudgetBidSelection(projectId: string, costCodeId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: allBiddingPackages } = useAllBiddingData(projectId);

  // Filter bids for this specific cost code
  const availableBids = useMemo(() => {
    if (!allBiddingPackages) return [];
    
    return allBiddingPackages
      .filter(pkg => pkg.cost_code_id === costCodeId)
      .flatMap(pkg => (pkg.project_bids || []).map(bid => ({
        ...bid,
        packageStatus: pkg.status,
        packageDueDate: pkg.due_date
      })))
      .filter(bid => bid.price !== null && bid.price !== undefined);
  }, [allBiddingPackages, costCodeId]);

  // Mutation to save selected bid
  const selectBidMutation = useMutation({
    mutationFn: async ({ budgetItemId, bidId }: { budgetItemId: string; bidId: string | null }) => {
      const { error } = await supabase
        .from('project_budgets')
        .update({ selected_bid_id: bidId })
        .eq('id', budgetItemId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-budgets'] });
      toast({
        title: "Bid selection updated",
        description: "Budget item linked to vendor bid successfully",
      });
    },
    onError: (error) => {
      console.error('Error updating bid selection:', error);
      toast({
        title: "Error",
        description: "Failed to update bid selection",
        variant: "destructive",
      });
    }
  });

  return {
    availableBids,
    selectBid: selectBidMutation.mutate,
    isLoading: selectBidMutation.isPending
  };
}
