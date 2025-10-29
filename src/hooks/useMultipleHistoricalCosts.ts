import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useMultipleHistoricalCosts(projectIds: string[]) {
  // Fetch historical costs for all project IDs
  const queries = useQuery({
    queryKey: ['multiple-historical-costs', ...projectIds.sort()],
    queryFn: async () => {
      if (projectIds.length === 0) {
        return {};
      }

      const { data, error } = await supabase
        .from('project_budgets')
        .select(`
          project_id,
          cost_code_id,
          actual_amount,
          cost_codes (*)
        `)
        .in('project_id', projectIds)
        .not('actual_amount', 'is', null)
        .neq('actual_amount', 0);

      if (error) throw error;

      // Build map: projectId -> (costCode -> actualAmount)
      const map: Record<string, Record<string, number>> = {};

      data.forEach((item) => {
        const costCode = item.cost_codes as any;
        if (costCode?.code && item.project_id) {
          if (!map[item.project_id]) {
            map[item.project_id] = {};
          }
          const code = costCode.code;
          map[item.project_id][code] = (map[item.project_id][code] || 0) + (item.actual_amount || 0);
        }
      });

      return map;
    },
    enabled: projectIds.length > 0,
  });

  return queries;
}
