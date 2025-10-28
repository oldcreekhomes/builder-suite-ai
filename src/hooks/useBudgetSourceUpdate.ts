import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type BudgetSource = 'estimate' | 'vendor-bid' | 'manual' | 'historical' | 'settings';

interface UpdateBudgetSourceParams {
  budgetItemId: string;
  source: BudgetSource;
  historicalProjectId?: string | null;
  manualQuantity?: number | null;
  manualUnitPrice?: number | null;
}

export function useBudgetSourceUpdate(projectId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateSourceMutation = useMutation({
    mutationFn: async (params: UpdateBudgetSourceParams) => {
      const updateData: any = {
        budget_source: params.source,
      };

      // Clear conflicting data based on source
      if (params.source === 'historical') {
        updateData.historical_project_id = params.historicalProjectId;
        updateData.selected_bid_id = null;
      } else if (params.source === 'vendor-bid') {
        updateData.historical_project_id = null;
      } else if (params.source === 'manual') {
        updateData.selected_bid_id = null;
        updateData.historical_project_id = null;
        if (params.manualQuantity !== undefined) {
          updateData.quantity = params.manualQuantity;
        }
        if (params.manualUnitPrice !== undefined) {
          updateData.unit_price = params.manualUnitPrice;
        }
      } else if (params.source === 'settings' || params.source === 'estimate') {
        updateData.selected_bid_id = null;
        updateData.historical_project_id = null;
      }

      const { error } = await supabase
        .from('project_budgets')
        .update(updateData)
        .eq('id', params.budgetItemId);

      if (error) throw error;
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: ['project-budgets', projectId] });
      
      const sourceLabels: Record<BudgetSource, string> = {
        'estimate': 'Estimate',
        'vendor-bid': 'Vendor Bid',
        'manual': 'Manual',
        'historical': 'Historical',
        'settings': 'Settings'
      };

      toast({
        title: "Budget source updated",
        description: `Now using ${sourceLabels[params.source]} for this budget item`,
      });
    },
    onError: (error) => {
      console.error('Error updating budget source:', error);
      toast({
        title: "Error",
        description: "Failed to update budget source",
        variant: "destructive",
      });
    }
  });

  return {
    updateSource: updateSourceMutation.mutate,
    isUpdating: updateSourceMutation.isPending
  };
}
