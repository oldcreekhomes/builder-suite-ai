import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProjectDefaultBankAccountId } from "./useProjectDefaultBankAccountId";

/**
 * Resolves the default "Deposit To" bank account for a project.
 * Resolution order:
 *   1. Per-project deposit override (project_default_deposit_accounts)
 *   2. Per-project bank default / tenant global default (fallback so the field
 *      is never empty when something sensible exists).
 */
export function useProjectDefaultDepositAccountId(
  projectId?: string | null,
): string | null {
  const fallbackBank = useProjectDefaultBankAccountId(projectId);

  const { data: depositDefault } = useQuery({
    queryKey: ["project-default-deposit-account", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_default_deposit_accounts" as any)
        .select("account_id")
        .eq("project_id", projectId as string)
        .maybeSingle();
      if (error) throw error;
      return (data as any)?.account_id as string | null | undefined;
    },
  });

  return (depositDefault ?? fallbackBank) ?? null;
}
