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
  bills_count: number;
  pos_count: number;
  bids_count: number;
  jes_count: number;
  files_count: number;
  budgets_count: number;
  schedule_count: number;
  photos_count: number;
  chat_count: number;
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
      return (data ?? []) as EmployeeActivityRow[];
    },
  });
};
