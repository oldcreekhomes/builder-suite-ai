import { useMemo } from "react";
import { useAccounts } from "./useAccounts";

/**
 * Returns the id of the account flagged as the tenant's default bank account
 * (accounts.is_default_bank = true), or null if none is set.
 */
export function useDefaultBankAccountId(): string | null {
  const { accounts } = useAccounts();
  return useMemo(() => {
    const def = accounts.find((a: any) => a?.is_default_bank === true);
    return def?.id ?? null;
  }, [accounts]);
}
