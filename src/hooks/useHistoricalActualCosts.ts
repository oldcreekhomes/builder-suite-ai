import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type CostCode = Tables<'cost_codes'>;

export interface HistoricalActualCosts {
  mapByCode: Record<string, number>;
  total: number;
  costCodes: CostCode[];
}

export function useHistoricalActualCosts(projectId: string | null) {
  return useQuery({
    queryKey: ['historical-actual-costs', projectId],
    queryFn: async (): Promise<HistoricalActualCosts> => {
      if (!projectId) {
        return {
          mapByCode: {},
          total: 0,
          costCodes: []
        };
      }
      
      const { data, error } = await supabase
        .from('project_budgets')
        .select(`
          cost_code_id,
          actual_amount,
          cost_codes (*)
        `)
        .eq('project_id', projectId)
        .not('actual_amount', 'is', null)
        .neq('actual_amount', 0);
      
      if (error) throw error;
      
      // Build map by cost code string (e.g., "4010")
      const mapByCode: Record<string, number> = {};
      const costCodeSet = new Map<string, CostCode>();
      let total = 0;
      
      data.forEach((item) => {
        const costCode = item.cost_codes as CostCode | null;
        if (costCode?.code) {
          const code = costCode.code;
          mapByCode[code] = (mapByCode[code] || 0) + (item.actual_amount || 0);
          costCodeSet.set(costCode.id, costCode);
        }
        total += item.actual_amount || 0;
      });
      
      return {
        mapByCode,
        total,
        costCodes: Array.from(costCodeSet.values())
      };
    },
    placeholderData: (prev) => prev,
    staleTime: 60000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}