import { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';

type CostCode = Tables<'cost_codes'>;

export function useAutoAddMissingCostCodes(
  currentProjectId: string,
  historicalCostCodes: CostCode[],
  existingBudgetItems: any[]
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const addMissingCostCodes = useMutation({
    mutationFn: async (costCodesToAdd: CostCode[]) => {
      if (costCodesToAdd.length === 0) return;

      const inserts = costCodesToAdd.map(cc => ({
        project_id: currentProjectId,
        cost_code_id: cc.id,
        quantity: 0,
        unit_price: 0,
        actual_amount: null
      }));

      const { error } = await supabase
        .from('project_budgets')
        .insert(inserts);

      if (error) throw error;
    },
    onSuccess: (_, costCodesToAdd) => {
      queryClient.invalidateQueries({ queryKey: ['project-budgets', currentProjectId] });
      if (costCodesToAdd.length > 0) {
        toast({ title: "Success", description: `Added ${costCodesToAdd.length} missing cost code${costCodesToAdd.length > 1 ? 's' : ''} from historical project` });
      }
    },
    onError: (error) => {
      console.error('Error adding missing cost codes:', error);
      toast({ title: "Error", description: 'Failed to add missing cost codes', variant: "destructive" });
    }
  });

  useEffect(() => {
    if (!historicalCostCodes.length || !existingBudgetItems.length) return;

    // Get existing cost codes by code string
    const existingCodes = new Set(
      existingBudgetItems
        .map(item => item.cost_codes?.code)
        .filter(Boolean)
    );

    // Find missing cost codes
    const missingCostCodes = historicalCostCodes.filter(
      cc => cc.code && !existingCodes.has(cc.code)
    );

    if (missingCostCodes.length > 0) {
      addMissingCostCodes.mutate(missingCostCodes);
    }
  }, [historicalCostCodes, existingBudgetItems]);

  return addMissingCostCodes;
}
