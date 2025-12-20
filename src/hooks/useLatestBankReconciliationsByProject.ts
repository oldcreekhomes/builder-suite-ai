import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Sandy Spring Bank account ID
const SANDY_SPRING_BANK_ACCOUNT_ID = "27ed0c3a-be95-4367-aa21-1a2b51ea1585";

export interface LatestReconciliation {
  project_id: string;
  statement_date: string;
}

export const useLatestBankReconciliationsByProject = (projectIds: string[]) => {
  return useQuery({
    queryKey: ["latest-bank-reconciliations", projectIds],
    queryFn: async () => {
      if (projectIds.length === 0) return {};

      // Fetch completed reconciliations for Sandy Spring Bank for these projects
      const { data, error } = await supabase
        .from("bank_reconciliations")
        .select("project_id, statement_date")
        .eq("bank_account_id", SANDY_SPRING_BANK_ACCOUNT_ID)
        .eq("status", "completed")
        .in("project_id", projectIds)
        .order("statement_date", { ascending: false });

      if (error) {
        console.error("Error fetching bank reconciliations:", error);
        throw error;
      }

      // Group by project_id and get the latest (first after ordering desc)
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
