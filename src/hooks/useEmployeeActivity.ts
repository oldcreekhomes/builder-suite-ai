import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Bucket = "8h" | "24h" | "7d" | "30d";
export const BUCKETS: Bucket[] = ["8h", "24h", "7d", "30d"];

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
  actions_8h: number; actions_24h: number; actions_7d: number; actions_30d: number;
  bills_8h: number; bills_24h: number; bills_7d: number; bills_30d: number;
  pos_8h: number; pos_24h: number; pos_7d: number; pos_30d: number;
  bids_8h: number; bids_24h: number; bids_7d: number; bids_30d: number;
  jes_8h: number; jes_24h: number; jes_7d: number; jes_30d: number;
  files_8h: number; files_24h: number; files_7d: number; files_30d: number;
  budgets_8h: number; budgets_24h: number; budgets_7d: number; budgets_30d: number;
  schedule_8h: number; schedule_24h: number; schedule_7d: number; schedule_30d: number;
  photos_8h: number; photos_24h: number; photos_7d: number; photos_30d: number;
  chat_8h: number; chat_24h: number; chat_7d: number; chat_30d: number;
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
