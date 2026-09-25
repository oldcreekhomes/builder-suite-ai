import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Bucket = "8h" | "24h" | "7d" | "30d";
export const BUCKETS: Bucket[] = ["8h", "24h", "7d", "30d"];

export const ACTIVITY_DOMAINS: Array<[key: string, label: string]> = [
  ["bills", "Bills"],
  ["pos", "POs"],
  ["bids", "Bids"],
  ["jes", "JEs"],
  ["files", "Files"],
  ["budgets", "Budgets"],
  ["schedule", "Schedule"],
  ["photos", "Photos"],
  ["payments", "Bill Payments"],
  ["checks", "Checks"],
  ["deposits", "Deposits"],
  ["credit_cards", "Credit Cards"],
  ["reconciliations", "Reconciliations"],
  ["reports", "Reports Emailed"],
  ["chat", "Chat"],
];

export interface EmployeeActivityRow {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  avatar_url: string | null;
  last_action: string | null;
  total_actions: number;
  counts: Record<string, Partial<Record<Bucket, number>>>;
}

export const countFor = (r: EmployeeActivityRow, domain: string, b: Bucket) =>
  Number(r.counts?.[domain]?.[b] ?? 0);

export const totalFor = (r: EmployeeActivityRow, b: Bucket) =>
  ACTIVITY_DOMAINS.reduce((s, [k]) => s + countFor(r, k, b), 0);

export const useEmployeeActivity = (enabled: boolean) => {
  return useQuery({
    queryKey: ["employee-activity-summary"],
    enabled,
    refetchInterval: 60_000,
    queryFn: async (): Promise<EmployeeActivityRow[]> => {
      const { data, error } = await supabase.rpc("get_employee_activity_summary", {});
      if (error) {
        console.error("get_employee_activity_summary failed:", error);
        throw error;
      }
      return (data ?? []) as unknown as EmployeeActivityRow[];
    },
  });
};
