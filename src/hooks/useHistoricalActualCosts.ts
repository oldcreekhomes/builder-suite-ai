import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useHistoricalActualCosts(projectId: string | null) {
  return useQuery({
    queryKey: ['historical-actual-costs', projectId],
    queryFn: async (): Promise<Record<string, number>> => {
      if (!projectId) return {};
      
      const { data, error } = await supabase
        .from('project_budgets')
        .select(`
          cost_code_id,
          actual_amount,
          cost_codes (
            code,
            name
          )
        `)
        .eq('project_id', projectId)
        .not('actual_amount', 'is', null)
        .neq('actual_amount', 0);
      
      if (error) throw error;
      
      // Create a map of cost_code_id to actual_amount for easy lookup
      const actualCostsMap = data.reduce((acc, item) => {
        acc[item.cost_code_id] = item.actual_amount || 0;
        return acc;
      }, {} as Record<string, number>);
      
      return actualCostsMap;
    },
    enabled: !!projectId,
  });
}