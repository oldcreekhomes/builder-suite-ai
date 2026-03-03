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
    mutationFn: async ({ budgetItemId, bidId, lotCount, bidTotal }: { budgetItemId: string; bidId: string | null; lotCount?: number; bidTotal?: number }) => {
      // Update the current budget item's selected bid
      const { error } = await supabase
        .from('project_budgets')
        .update({ selected_bid_id: bidId })
        .eq('id', budgetItemId);
      
      if (error) throw error;

      // If multi-lot allocation, update the unit_price for all lot budget rows
      if (lotCount && lotCount > 1 && bidTotal && bidId) {
        const perLot = Math.floor((bidTotal / lotCount) * 100) / 100;
        const lastLotAmount = Number((bidTotal - (perLot * (lotCount - 1))).toFixed(2));

        // Get the current budget item to find its cost_code_id and project_id
        const { data: currentItem, error: fetchError } = await supabase
          .from('project_budgets')
          .select('cost_code_id, project_id')
          .eq('id', budgetItemId)
          .single();

        if (fetchError) throw fetchError;

        // Get all budget items for this cost code across the project (all lots)
        const { data: allBudgetItems, error: allError } = await supabase
          .from('project_budgets')
          .select('id, lot_id')
          .eq('project_id', currentItem.project_id)
          .eq('cost_code_id', currentItem.cost_code_id)
          .order('lot_id', { ascending: true });

        if (allError) throw allError;

        if (allBudgetItems && allBudgetItems.length > 0) {
          // Update all but the last with perLot, last with remainder
          for (let i = 0; i < allBudgetItems.length; i++) {
            const amount = i === allBudgetItems.length - 1 ? lastLotAmount : perLot;
            const { error: updateError } = await supabase
              .from('project_budgets')
              .update({ unit_price: amount, quantity: 1, selected_bid_id: bidId })
              .eq('id', allBudgetItems[i].id);
            if (updateError) throw updateError;
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-budgets'] });
      queryClient.invalidateQueries({ queryKey: ['job-costs'] });
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
