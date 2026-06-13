import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns a Map<account_id, display_name> of per-project account name overrides.
 * Use resolveAccountName(account, map) to get the effective display name.
 */
export function useProjectAccountNames(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ["project-account-overrides", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_account_overrides" as any)
        .select("account_id, display_name")
        .eq("project_id", projectId as string);
      if (error) throw error;
      const map = new Map<string, string>();
      for (const row of (data as any[]) ?? []) {
        if (row?.account_id && row?.display_name) {
          map.set(row.account_id as string, row.display_name as string);
        }
      }
      return map;
    },
    staleTime: 60_000,
  });
}

export function resolveAccountName(
  account: { id: string; name: string } | null | undefined,
  overrides: Map<string, string> | null | undefined,
): string {
  if (!account) return "";
  if (overrides && overrides.has(account.id)) return overrides.get(account.id) as string;
  return account.name;
}
