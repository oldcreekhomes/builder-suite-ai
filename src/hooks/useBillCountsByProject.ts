import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { todayLocalStr, isCountableBill, isCurrentBill, isLateBill, isRejectedBill } from "@/lib/billIssues";

interface ProjectBillCounts {
  currentCount: number;   // draft bills NOT past due
  lateCount: number;      // draft bills past due
  rejectedCount: number;  // void bills
  payCount: number;       // posted bills
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
          currentCount: projectBills.filter(b => isCurrentBill(b, todayStr)).length,
          lateCount: projectBills.filter(b => isLateBill(b, todayStr)).length,
          rejectedCount: projectBills.filter(b => isRejectedBill(b)).length,
          payCount: projectBills.filter(b => b.status === 'posted').length,
        };
      });

      return countsByProject;
    },
    enabled: projectIds.length > 0,
  });
}
