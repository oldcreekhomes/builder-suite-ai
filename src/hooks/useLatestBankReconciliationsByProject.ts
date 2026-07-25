import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LatestReconciliation {
  project_id: string;
  statement_date: string;
}

export const useLatestBankReconciliationsByProject = (projectIds: string[]) => {
  return useQuery({
    queryKey: ["latest-bank-reconciliations", projectIds],
    queryFn: async () => {
      if (projectIds.length === 0) return {};

      // Latest completed reconciliation per project, across ALL bank accounts.
      const { data, error } = await supabase
        .from("bank_reconciliations")
        .select("project_id, statement_date")
        .eq("status", "completed")
        .in("project_id", projectIds)
        .order("statement_date", { ascending: false });

      if (error) {
        console.error("Error fetching bank reconciliations:", error);
        throw error;
      }

      const latestByProject: Record<string, LatestReconciliation> = {};
      for (const rec of data || []) {
        if (rec.project_id && !latestByProject[rec.project_id]) {
          latestByProject[rec.project_id] = {
            project_id: rec.project_id,
            statement_date: rec.statement_date,
          };
        }
      }

      return latestByProject;
    },
    enabled: projectIds.length > 0,
  });
};
