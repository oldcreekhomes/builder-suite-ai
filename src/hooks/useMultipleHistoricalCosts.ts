import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useMultipleHistoricalCosts(projectIds: string[]) {
  // Create sorted array without mutating the original
  const sortedIds = [...projectIds].sort();

  // Fetch historical costs for all project IDs
  const queries = useQuery({
    queryKey: ['multiple-historical-costs', ...sortedIds],
    queryFn: async () => {
      if (sortedIds.length === 0) {
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
        .in('project_id', sortedIds)
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
    enabled: sortedIds.length > 0,
    placeholderData: (prev) => prev,
    staleTime: 60000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return queries;
}
