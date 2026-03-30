import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { parseHistoricalKey } from '@/hooks/useHistoricalProjects';

export function useHistoricalBudgetImport(projectId: string, historicalKey?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const parsed = historicalKey ? parseHistoricalKey(historicalKey) : null;

  // Fetch historical project's budget items with actual costs
  const { data: historicalBudgetItems = [], isLoading } = useQuery({
    queryKey: ['historical-budget-items', historicalKey],
    queryFn: async () => {
      if (!parsed) return [];
      
      let query = supabase
        .from('project_budgets')
        .select(`
          *,
          cost_codes (*)
        `)
        .eq('project_id', parsed.projectId)
        .not('actual_amount', 'is', null)
        .neq('actual_amount', 0);

      if (parsed.lotId) {
        query = query.eq('lot_id', parsed.lotId);
      } else {
        query = query.is('lot_id', null);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!historicalKey,
  });

  // Import selected items with optional percentage adjustment
  const importMutation = useMutation({
    mutationFn: async ({ 
      selectedItemIds, 
      adjustmentPercentage = 0 
    }: { 
      selectedItemIds: string[]; 
      adjustmentPercentage?: number 
    }) => {
      const itemsToImport = historicalBudgetItems.filter(item => 
        selectedItemIds.includes(item.id)
      );

      const budgetItemsToCreate = itemsToImport.map(item => {
        const actualAmount = item.actual_amount || 0;
        const adjustedAmount = adjustmentPercentage !== 0
          ? actualAmount * (1 + adjustmentPercentage / 100)
          : actualAmount;

        return {
          project_id: projectId,
          cost_code_id: item.cost_code_id,
          quantity: 1,
          unit_price: adjustedAmount,
        };
      });

      const { error } = await supabase
        .from('project_budgets')
        .insert(budgetItemsToCreate);

      if (error) throw error;

      return budgetItemsToCreate.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['project-budgets', projectId] });
      queryClient.invalidateQueries({ queryKey: ['job-costs'] });
      toast({
        title: "Import successful",
        description: `Imported ${count} budget items from historical project`,
      });
    },
    onError: (error) => {
      console.error('Error importing budget items:', error);
      toast({
        title: "Import failed",
        description: "Failed to import budget items from historical project",
        variant: "destructive",
      });
    }
  });

  return {
    historicalBudgetItems,
    isLoading,
    importItems: importMutation.mutate,
    isImporting: importMutation.isPending
  };
}
