import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ProjectBillCounts {
  currentCount: number;   // draft bills NOT past due
  lateCount: number;      // draft bills past due
  rejectedCount: number;  // void bills
  payCount: number;       // posted bills
}

export function useBillCountsByProject(projectIds: string[]) {
  return useQuery({
    queryKey: ['bill-counts-by-project', projectIds],
    queryFn: async (): Promise<Record<string, ProjectBillCounts>> => {
      if (!projectIds.length) return {};

      const { data: bills, error } = await supabase
        .from('bills')
        .select('id, project_id, status, due_date, is_reversal, archived_at')
        .in('project_id', projectIds)
        .in('status', ['draft', 'posted', 'void']);

      if (error) throw error;

      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      const dueStr = (d: string | null) => (d ? String(d).slice(0, 10) : null);

      const countsByProject: Record<string, ProjectBillCounts> = {};

      projectIds.forEach(projectId => {
        const projectBills = (bills?.filter(b => b.project_id === projectId) || [])
          .filter(b => !(b as any).archived_at && !b.is_reversal);

        countsByProject[projectId] = {
          currentCount: projectBills.filter(b => {
            if (b.status !== 'draft') return false;
            const d = dueStr(b.due_date);
            return !d || d >= todayStr;
          }).length,
          // Late = any unpaid bill (Review, Rejected, Approved) past due
          lateCount: projectBills.filter(b => {
            const d = dueStr(b.due_date);
            return !!d && d < todayStr;
          }).length,
          rejectedCount: projectBills.filter(b => b.status === 'void').length,
          payCount: projectBills.filter(b => b.status === 'posted').length,
        };
      });

      return countsByProject;
    },
    enabled: projectIds.length > 0,
  });
}
