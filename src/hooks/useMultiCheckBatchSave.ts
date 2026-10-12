import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChecks } from "./useChecks";
import { newBatchProgress, resumeCheckBatch, type BatchProgress } from "@/lib/multiCheckBatchProgress";

export interface MultiCheckLineInput {
  lotId?: string;
  amount: number; // dollars
}

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
  amount: number; // dollars (check total)
  /** One line per lot when the check was split across addresses. */
  lines?: MultiCheckLineInput[];
  /** Files to attach to this check after it is created. */
  files?: File[];
}

let pendingBatch: BatchProgress<MultiCheckRowInput> | null = null;

const sanitize = (name: string) =>
  name.replace(/\s+/g, "_").replace(/[^\w.-]/g, "_").replace(/_+/g, "_");

/**
 * Saves many checks in a single batch, tagging each with the same
 * multi_entry_batch_id. Reuses the existing createCheck code path so
 * accounting posting, RLS, and audit behavior are identical to the
 * Write Checks page. Attachments use the same storage path/table as Write Checks.
 */
export function useMultiCheckBatchSave() {
  const queryClient = useQueryClient();
  const { createCheck } = useChecks();

  return useMutation({
    mutationFn: async (rows: MultiCheckRowInput[]) => {
      if (!rows.length) throw new Error("No rows to save");

      if (!pendingBatch) pendingBatch = newBatchProgress(crypto.randomUUID(), rows);
      const progress = pendingBatch;
      const userId = (await supabase.auth.getUser()).data.user?.id;

      const saved = await resumeCheckBatch(progress, {
        create: async (row) => {
        const lines = row.lines && row.lines.length > 0
          ? row.lines
          : [{ amount: row.amount }];

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
          checkLines: lines.map((l) =>
            row.entryType === "cost_code"
              ? {
                  line_type: "job_cost" as const,
                  cost_code_id: row.costCodeId,
                  project_id: row.projectId,
                  lot_id: l.lotId || undefined,
                  amount: l.amount,
                  memo: row.description || undefined,
                }
              : {
                  line_type: "expense" as const,
                  account_id: row.accountId,
                  project_id: row.projectId,
                  lot_id: l.lotId || undefined,
                  amount: l.amount,
                  memo: row.description || undefined,
                },
          ),
        });

        const newId = result?.id;
        if (!newId) throw new Error("The check was not returned after saving.");
        return newId;
        },
        tag: async (checkId, batchId) => {
          const { error } = await supabase.from("checks")
            .update({ multi_entry_batch_id: batchId }).eq("id", checkId);
          if (error) throw error;
        },
        attach: async (checkId, file) => {
          const filePath = `check-attachments/${checkId}/${crypto.randomUUID()}_${sanitize(file.name)}`;
          const { error: uploadError } = await supabase.storage.from("project-files").upload(filePath, file);
          if (uploadError) throw new Error(`Could not upload ${file.name}: ${uploadError.message}`);
          const { error: recordError } = await supabase.from("check_attachments").insert({
            check_id: checkId, file_name: file.name, file_path: filePath,
            file_size: file.size, content_type: file.type, uploaded_by: userId,
          });
          if (recordError) {
            await supabase.storage.from("project-files").remove([filePath]);
            throw new Error(`Could not save ${file.name}: ${recordError.message}`);
          }
        },
      });
      pendingBatch = null;
      return saved;
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["multi-check-batches"] });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checks"] });
      queryClient.invalidateQueries({ queryKey: ["multi-check-batches"] });
    },
  });
}
