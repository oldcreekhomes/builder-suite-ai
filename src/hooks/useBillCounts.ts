import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface BillCounts {
  pendingCount: number;
  rejectedCount: number;
  approvedCount: number;
  payBillsCount: number;
}

export function useBillCounts(projectId?: string) {
  return useQuery({
    queryKey: ['bill-approval-counts', projectId],
    queryFn: async (): Promise<BillCounts> => {
      // Get counts for each status
      const pendingQuery = supabase
        .from('bills')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'draft');
      
      const rejectedQuery = supabase
        .from('bills')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'void');
      
      const approvedQuery = supabase
        .from('bills')
        .select('id', { count: 'exact', head: true })
        .in('status', ['posted', 'paid']);
      
      const payBillsQuery = supabase
        .from('bills')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'posted');

      // Apply project filter if provided
      if (projectId) {
        pendingQuery.eq('project_id', projectId);
        rejectedQuery.eq('project_id', projectId);
        approvedQuery.eq('project_id', projectId);
        payBillsQuery.eq('project_id', projectId);
      }

      const [pendingResult, rejectedResult, approvedResult, payBillsResult] = await Promise.all([
        pendingQuery,
        rejectedQuery,
        approvedQuery,
        payBillsQuery
      ]);

      if (pendingResult.error) throw pendingResult.error;
      if (rejectedResult.error) throw rejectedResult.error;
      if (approvedResult.error) throw approvedResult.error;
      if (payBillsResult.error) throw payBillsResult.error;

      return {
        pendingCount: pendingResult.count || 0,
        rejectedCount: rejectedResult.count || 0,
        approvedCount: approvedResult.count || 0,
        payBillsCount: payBillsResult.count || 0
      };
    },
  });
}