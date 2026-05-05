import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EmployeeActivityRow {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  avatar_url: string | null;
  last_action: string | null;
  last_sign_in_at?: string | null;
  bills_count: number;
  pos_count: number;
  bids_count: number;
  jes_count: number;
  files_count: number;
  budgets_count: number;
  schedule_count: number;
  total_actions: number;
}

export const useEmployeeActivity = (enabled: boolean) => {
  return useQuery({
    queryKey: ["employee-activity-summary"],
    enabled,
    queryFn: async (): Promise<EmployeeActivityRow[]> => {
      const { data, error } = await supabase.rpc("get_employee_activity_summary", {});
      if (error) {
        console.error("get_employee_activity_summary failed:", error);
        throw error;
      }
      const rows = (data ?? []) as EmployeeActivityRow[];
      if (rows.length === 0) return rows;

      const ids = rows.map((r) => r.user_id);
      const { data: signIns } = await supabase.rpc("get_users_last_sign_in", { user_ids: ids });
      const byId = new Map<string, string | null>(
        (signIns ?? []).map((r: any) => [r.user_id, r.last_sign_in_at])
      );
      return rows.map((r) => ({ ...r, last_sign_in_at: byId.get(r.user_id) ?? null }));
    },
  });
};
