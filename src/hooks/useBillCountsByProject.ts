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
        .select('id, project_id, status, due_date, is_reversal')
        .in('project_id', projectIds)
        .in('status', ['draft', 'posted', 'void']);

      if (error) throw error;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const countsByProject: Record<string, ProjectBillCounts> = {};

      projectIds.forEach(projectId => {
        const projectBills = bills?.filter(b => b.project_id === projectId) || [];
        const draftBills = projectBills.filter(b => b.status === 'draft');
        
        countsByProject[projectId] = {
          currentCount: draftBills.filter(b => {
            if (!b.due_date) return true; // No due date = current
            const dueDate = new Date(b.due_date);
            return dueDate >= today;
          }).length,
          lateCount: draftBills.filter(b => {
            if (!b.due_date) return false;
            const dueDate = new Date(b.due_date);
            return dueDate < today;
          }).length,
          rejectedCount: projectBills.filter(b => b.status === 'void').length,
          payCount: projectBills.filter(b => b.status === 'posted' && !b.is_reversal).length,
        };
      });

      return countsByProject;
    },
    enabled: projectIds.length > 0,
  });
}
