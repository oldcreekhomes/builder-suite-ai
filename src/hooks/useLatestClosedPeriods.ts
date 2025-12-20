import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ClosedPeriodData {
  closed_at: string;
  period_end_date: string;
}

export const useLatestClosedPeriodsByProject = (projectIds: string[]) => {
  return useQuery({
    queryKey: ['latest-closed-periods', projectIds],
    queryFn: async () => {
      if (projectIds.length === 0) return {};

      const { data, error } = await supabase
        .from('accounting_periods')
        .select('project_id, closed_at, period_end_date')
        .in('project_id', projectIds)
        .eq('status', 'closed')
        .order('period_end_date', { ascending: false });

      if (error) throw error;

      // Group by project and keep only the most recent
      const map: Record<string, ClosedPeriodData> = {};
      data?.forEach(period => {
        if (!map[period.project_id]) {
          map[period.project_id] = {
            closed_at: period.closed_at,
            period_end_date: period.period_end_date
          };
        }
      });
      return map;
    },
    enabled: projectIds.length > 0,
  });
};
