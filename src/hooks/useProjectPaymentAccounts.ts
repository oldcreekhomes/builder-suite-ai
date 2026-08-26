import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccounts } from "./useAccounts";
import { useProjectAccountNames, resolveAccountName } from "./useProjectAccountNames";

export interface PaymentAccountOption {
  id: string;
  code: string;
  name: string;
  type: string;
  subtype?: string | null;
  category: "Cash/Bank" | "Credit Card";
}

/**
 * Returns the bank / credit-card accounts that may be used as payment methods
 * for a given project:
 *  - accounts excluded from the project's Chart of Accounts are removed
 *  - names use the project's per-project display-name override when set
 *
 * With no projectId (company overhead), the full tenant list and tenant names
 * are returned.
 */
export function useProjectPaymentAccounts(projectId?: string | null) {
  const { accounts } = useAccounts();
  const { data: overrides } = useProjectAccountNames(projectId);

  const { data: excludedIds } = useQuery({
    queryKey: ["project-account-exclusions", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_account_exclusions")
        .select("account_id")
        .eq("project_id", projectId as string);
      if (error) throw error;
      return new Set((data ?? []).map((r: { account_id: string }) => r.account_id));
    },
  });

  return useMemo(() => {
    const list = (accounts ?? []) as any[];
    const anyHasSubtype = list.some((a) => a?.subtype);

    const isBank = (a: any) =>
      anyHasSubtype
        ? a.subtype === "bank"
        : a.type === "asset" &&
          ["cash", "bank", "checking", "savings"].some((k) =>
            String(a.name || "").toLowerCase().includes(k),
          );

    const isCard = (a: any) =>
      anyHasSubtype
        ? a.subtype === "credit_card"
        : a.type === "liability" &&
          ["credit", "card"].some((k) => String(a.name || "").toLowerCase().includes(k));

    const allowed = list.filter((a) => {
      if (a?.is_active === false) return false;
      if (excludedIds && excludedIds.has(a.id)) return false;
      return isBank(a) || isCard(a);
    });

    const decorate = (a: any): PaymentAccountOption => ({
      id: a.id,
      code: a.code,
      name: resolveAccountName(a, overrides ?? null),
      type: a.type,
      subtype: a.subtype ?? null,
      category: isCard(a) ? "Credit Card" : "Cash/Bank",
    });

    const bankAccounts = allowed.filter(isBank).map(decorate);
    const creditCardAccounts = allowed.filter((a) => !isBank(a) && isCard(a)).map(decorate);

    return {
      bankAccounts,
      creditCardAccounts,
      paymentAccounts: [...bankAccounts, ...creditCardAccounts],
    };
  }, [accounts, excludedIds, overrides]);
}
