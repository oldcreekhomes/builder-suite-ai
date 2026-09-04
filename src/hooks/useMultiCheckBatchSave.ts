import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChecks } from "./useChecks";

export interface MultiCheckRowInput {
  projectId: string;
  checkDate: string; // yyyy-MM-dd
  bankAccountId: string;
  payToCompanyId?: string;
  payToName: string;
  checkNumber?: string;
  entryType?: "account" | "cost_code";
  accountId?: string;
  costCodeId?: string;
  description?: string;
  amount: number; // dollars
}

/**
 * Saves many checks in a single batch, tagging each with the same
 * multi_entry_batch_id. Reuses the existing createCheck code path so
 * accounting posting, RLS, and audit behavior are identical to the
 * Write Checks page.
 */
export function useMultiCheckBatchSave() {
  const queryClient = useQueryClient();
  const { createCheck } = useChecks();

  return useMutation({
    mutationFn: async (rows: MultiCheckRowInput[]) => {
      if (!rows.length) throw new Error("No rows to save");

      const batchId = (globalThis.crypto as Crypto).randomUUID();
      const createdIds: string[] = [];

      for (const row of rows) {
        const result = await createCheck.mutateAsync({
          checkData: {
            check_date: row.checkDate,
            pay_to: row.payToName,
            bank_account_id: row.bankAccountId,
            project_id: row.projectId,
            amount: row.amount,
            memo: row.description || undefined,
            check_number: row.checkNumber || undefined,
          },
          checkLines: [
            {
              line_type: "expense",
              account_id: row.accountId,
              project_id: row.projectId,
              amount: row.amount,
              memo: row.description || undefined,
            },
          ],
        });

        const newId = (result as any)?.id;
        if (newId) createdIds.push(newId);
      }

      if (createdIds.length > 0) {
        const { error } = await supabase
          .from("checks")
          .update({ multi_entry_batch_id: batchId } as any)
          .in("id", createdIds);
        if (error) {
          console.error("[multi-check] batch tag failed", error);
        }
      }

      return { batchId, count: createdIds.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checks"] });
      queryClient.invalidateQueries({ queryKey: ["multi-check-batches"] });
    },
  });
}
