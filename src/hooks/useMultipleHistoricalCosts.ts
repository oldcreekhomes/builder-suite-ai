import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Accepts composite keys like "projectId::lotId" or plain "projectId".
 * Returns a map keyed by the same composite key => (costCode => actualAmount).
 */
export function useMultipleHistoricalCosts(compositeKeys: string[]) {
  const sortedKeys = [...compositeKeys].sort();

  const queries = useQuery({
    queryKey: ['multiple-historical-costs', ...sortedKeys],
    queryFn: async () => {
      if (sortedKeys.length === 0) {
        return {};
      }

      // Parse composite keys into groups
      const parsed = sortedKeys.map(key => {
        const parts = key.split('::');
        return { key, projectId: parts[0], lotId: parts[1] || null };
      });

      // Get unique project IDs
      const projectIds = [...new Set(parsed.map(p => p.projectId))];

      const { data, error } = await supabase
        .from('project_budgets')
        .select(`
          project_id,
          lot_id,
          cost_code_id,
          actual_amount,
          cost_codes (*)
        `)
        .in('project_id', projectIds)
        .not('actual_amount', 'is', null)
        .neq('actual_amount', 0);

      if (error) throw error;

      // Build map: compositeKey -> (costCode -> actualAmount)
      const map: Record<string, Record<string, number>> = {};

      // For each parsed key, filter data to matching rows
      parsed.forEach(({ key, projectId, lotId }) => {
        if (!map[key]) map[key] = {};

        data.forEach((item) => {
          if (item.project_id !== projectId) return;
          
          // Lot filtering: if lotId specified, only match that lot
          if (lotId) {
            if (item.lot_id !== lotId) return;
          } else {
            // No lot specified: only match rows with no lot
            if (item.lot_id !== null) return;
          }

          const costCode = item.cost_codes as any;
          if (costCode?.code) {
            const code = costCode.code;
            map[key][code] = (map[key][code] || 0) + (item.actual_amount || 0);
          }
        });
      });

      return map;
    },
    enabled: sortedKeys.length > 0,
    placeholderData: (prev) => prev,
    staleTime: 60000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return queries;
}
