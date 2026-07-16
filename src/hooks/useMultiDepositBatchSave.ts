import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDeposits } from "./useDeposits";

export interface MultiDepositRowInput {
  projectId: string;
  depositDate: string; // yyyy-MM-dd
  bankAccountId: string;
  receivedFromCompanyId?: string;
  receivedFromName?: string;
  checkNumber?: string;
  accountId: string;
  description?: string;
  amount: number; // dollars
}

/**
 * Saves many deposits in a single batch, tagging each with the same
 * multi_entry_batch_id. Reuses the existing createDeposit code path so
 * accounting posting, RLS, and audit behavior are identical to the single
 * Make Deposits page.
 */
export function useMultiDepositBatchSave() {
  const queryClient = useQueryClient();
  const { createDeposit } = useDeposits();

  return useMutation({
    mutationFn: async (rows: MultiDepositRowInput[]) => {
      if (!rows.length) throw new Error("No rows to save");

      const batchId = (globalThis.crypto as Crypto).randomUUID();
      const createdIds: string[] = [];

      for (const row of rows) {
        const result = await createDeposit.mutateAsync({
          silent: true,
          depositData: {
            deposit_date: row.depositDate,
            bank_account_id: row.bankAccountId,
            project_id: row.projectId,
            amount: row.amount,
            memo: row.description || row.receivedFromName || null,
            company_id: row.receivedFromCompanyId || undefined,
            check_number: row.checkNumber || undefined,
          },
          depositLines: [
            {
              line_type: "revenue",
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
          .from("deposits")
          .update({ multi_entry_batch_id: batchId })
          .in("id", createdIds);
        if (error) {
          console.error("[multi-deposit] batch tag failed", error);
        }
      }

      return { batchId, count: createdIds.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deposits"] });
      queryClient.invalidateQueries({ queryKey: ["multi-deposit-batches"] });
    },
  });
}
