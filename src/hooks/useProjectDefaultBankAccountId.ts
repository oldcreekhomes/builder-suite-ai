import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDefaultBankAccountId } from "./useDefaultBankAccountId";

/**
 * Resolves the default bank account id for a transaction with this resolution order:
 *   1. Per-project override (project_default_bank_accounts)
 *   2. Tenant-wide global default (accounts.is_default_bank = true)
 *   3. null
 *
 * When projectId is undefined (company-overhead transaction), only the global
 * default applies.
 */
export function useProjectDefaultBankAccountId(projectId?: string | null): string | null {
  const globalDefault = useDefaultBankAccountId();

  const { data: projectDefault } = useQuery({
    queryKey: ["project-default-bank-account", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_default_bank_accounts" as any)
        .select("account_id")
        .eq("project_id", projectId as string)
        .maybeSingle();
      if (error) throw error;
      return (data as any)?.account_id as string | null | undefined;
    },
  });

  return (projectDefault ?? globalDefault) ?? null;
}
