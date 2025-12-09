import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ProjectBillCounts {
  reviewCount: number;
  payCount: number;
}

export function useBillCountsByProject(projectIds: string[]) {
  return useQuery({
    queryKey: ['bill-counts-by-project', projectIds],
    queryFn: async (): Promise<Record<string, ProjectBillCounts>> => {
      if (!projectIds.length) return {};

      const { data: bills, error } = await supabase
        .from('bills')
        .select('id, project_id, status')
        .in('project_id', projectIds)
        .in('status', ['draft', 'posted']);

      if (error) throw error;

      const countsByProject: Record<string, ProjectBillCounts> = {};

      projectIds.forEach(projectId => {
        const projectBills = bills?.filter(b => b.project_id === projectId) || [];
        
        countsByProject[projectId] = {
          reviewCount: projectBills.filter(b => b.status === 'draft').length,
          payCount: projectBills.filter(b => b.status === 'posted').length,
        };
      });

      return countsByProject;
    },
    enabled: projectIds.length > 0,
  });
}
