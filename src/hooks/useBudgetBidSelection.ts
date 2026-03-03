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
    mutationFn: async ({ budgetItemId, bidId, lotCount, bidTotal, allocationMode }: { budgetItemId: string; bidId: string | null; lotCount?: number; bidTotal?: number; allocationMode?: 'full' | 'per-lot' }) => {
      // If full allocation (or no multi-lot), write the full bid amount to this row
      if (!allocationMode || allocationMode === 'full' || !lotCount || lotCount <= 1) {
        const { error } = await supabase
          .from('project_budgets')
          .update({ 
            selected_bid_id: bidId,
            quantity: bidTotal ? 1 : undefined,
            unit_price: bidTotal || undefined,
          })
          .eq('id', budgetItemId);
        
        if (error) throw error;
        return;
      }

      // Per-lot allocation: split across all lots
      if (bidTotal && bidId) {
        const perLot = Math.floor((bidTotal / lotCount) * 100) / 100;
        const lastLotAmount = Number((bidTotal - (perLot * (lotCount - 1))).toFixed(2));

        const { data: currentItem, error: fetchError } = await supabase
          .from('project_budgets')
          .select('cost_code_id, project_id')
          .eq('id', budgetItemId)
          .single();

        if (fetchError) throw fetchError;

        const { data: allBudgetItems, error: allError } = await supabase
          .from('project_budgets')
          .select('id, lot_id')
          .eq('project_id', currentItem.project_id)
          .eq('cost_code_id', currentItem.cost_code_id)
          .order('lot_id', { ascending: true });

        if (allError) throw allError;

        if (allBudgetItems && allBudgetItems.length > 0) {
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
