import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { todayLocalStr, isCountableBill, isReviewBill, isApprovedBill, isLateBill, isRejectedBill } from "@/lib/billIssues";

interface ProjectBillCounts {
  reviewCount: number;    // Review tab (draft)
  approvedCount: number;  // Approved tab (posted)
  rejectedCount: number;  // Rejected tab (void)
  lateCount: number;      // Review or Approved, past due
  reviewLateCount: number;
  approvedLateCount: number;
}

export function useBillCountsByProject(projectIds: string[]) {
  return useQuery({
    queryKey: ['bill-counts-by-project', projectIds],
    refetchOnMount: 'always',
    queryFn: async (): Promise<Record<string, ProjectBillCounts>> => {
      if (!projectIds.length) return {};

      const { data: bills, error } = await supabase
        .from('bills')
        .select('id, project_id, status, terms, due_date, is_reversal, reversed_by_id, archived_at')
        .in('project_id', projectIds)
        .in('status', ['draft', 'posted', 'void']);

      if (error) throw error;

      const todayStr = todayLocalStr();
      const countsByProject: Record<string, ProjectBillCounts> = {};

      projectIds.forEach(projectId => {
        const projectBills = (bills?.filter(b => b.project_id === projectId) || [])
          .filter(b => isCountableBill(b as any));

        countsByProject[projectId] = {
          reviewCount: projectBills.filter(b => isReviewBill(b, todayStr)).length,
          approvedCount: projectBills.filter(b => isApprovedBill(b, todayStr)).length,
          rejectedCount: projectBills.filter(b => isRejectedBill(b)).length,
          lateCount: projectBills.filter(b => isLateBill(b, todayStr)).length,
          reviewLateCount: projectBills.filter(b => isReviewBill(b, todayStr) && isLateBill(b, todayStr)).length,
          approvedLateCount: projectBills.filter(b => isApprovedBill(b, todayStr) && isLateBill(b, todayStr)).length,
        };
      });

      return countsByProject;
    },
    enabled: projectIds.length > 0,
  });
}
