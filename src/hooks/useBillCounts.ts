import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface BillCounts {
  pendingCount: number;
  rejectedCount: number;
  approvedCount: number;
  payBillsCount: number;
  aiExtractCount: number;
}

export function useBillCounts(projectId?: string, projectIds?: string[]) {
  return useQuery({
    queryKey: ['bill-approval-counts', projectId, projectIds],
    refetchOnWindowFocus: true,
    refetchInterval: 2000,
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
        .eq('status', 'paid');

      // Get count for AI extraction (pending uploads)
      const aiExtractQuery = supabase
        .from('pending_bill_uploads')
        .select('id', { count: 'exact', head: true })
        .in('status', ['extracted', 'completed', 'reviewing']);

      // Apply project filter if provided
      if (projectIds && projectIds.length > 0) {
        pendingQuery.in('project_id', projectIds);
        rejectedQuery.in('project_id', projectIds);
        approvedQuery.in('project_id', projectIds);
        payBillsQuery.in('project_id', projectIds);
        // Note: pending_bill_uploads doesn't have project_id, so no filter for AI
      } else if (projectId) {
        pendingQuery.eq('project_id', projectId);
        rejectedQuery.eq('project_id', projectId);
        approvedQuery.eq('project_id', projectId);
        payBillsQuery.eq('project_id', projectId);
        // Note: pending_bill_uploads doesn't have project_id, so no filter for AI
      }

      const [pendingResult, rejectedResult, approvedResult, payBillsResult, aiExtractResult] = await Promise.all([
        pendingQuery,
        rejectedQuery,
        approvedQuery,
        payBillsQuery,
        aiExtractQuery
      ]);

      if (pendingResult.error) throw pendingResult.error;
      if (rejectedResult.error) throw rejectedResult.error;
      if (approvedResult.error) throw approvedResult.error;
      if (payBillsResult.error) throw payBillsResult.error;
      if (aiExtractResult.error) throw aiExtractResult.error;

      return {
        pendingCount: pendingResult.count || 0,
        rejectedCount: rejectedResult.count || 0,
        approvedCount: approvedResult.count || 0,
        payBillsCount: payBillsResult.count || 0,
        aiExtractCount: aiExtractResult.count || 0
      };
    },
  });
}