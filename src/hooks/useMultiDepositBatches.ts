import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MultiDepositBatchDeposit {
  id: string;
  deposit_date: string;
  amount: number;
  project_id: string | null;
  project_address: string | null;
  bank_account_id: string | null;
  bank_account_label: string | null;
  company_name: string | null;
  check_number: string | null;
  memo: string | null;
  reconciled: boolean;
  reconciliation_id: string | null;
}

export interface MultiDepositBatch {
  batchId: string;
  savedAt: string;
  savedBy: string | null;
  savedByName: string | null;
  count: number;
  projectCount: number;
  total: number;
  deposits: MultiDepositBatchDeposit[];
}

export function useMultiDepositBatches() {
  return useQuery({
    queryKey: ["multi-deposit-batches"],
    queryFn: async (): Promise<MultiDepositBatch[]> => {
      const { data, error } = await supabase
        .from("deposits")
        .select(
          `
          id,
          deposit_date,
          amount,
          project_id,
          bank_account_id,
          check_number,
          memo,
          reconciled,
          reconciliation_id,
          multi_entry_batch_id,
          created_at,
          created_by,
          projects:project_id (address),
          accounts:bank_account_id (code, name),
          companies:company_id (company_name)
        `,
        )
        .not("multi_entry_batch_id", "is", null)
        .eq("is_reversal", false)
        .is("reversed_at", null)
        .order("created_at", { ascending: false })
        .limit(1000);

      if (error) throw error;

      const userIds = Array.from(
        new Set((data || []).map((d: any) => d.created_by).filter(Boolean)),
      );
      let usersMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from("users")
          .select("id, first_name, last_name")
          .in("id", userIds);
        if (users) {
          usersMap = users.reduce((acc, u: any) => {
            acc[u.id] = [u.first_name, u.last_name].filter(Boolean).join(" ") || "";
            return acc;
          }, {} as Record<string, string>);
        }
      }

      const groups = new Map<string, MultiDepositBatch>();
      for (const row of data || []) {
        const r: any = row;
        const batchId = r.multi_entry_batch_id as string;
        if (!batchId) continue;

        const deposit: MultiDepositBatchDeposit = {
          id: r.id,
          deposit_date: r.deposit_date,
          amount: Number(r.amount || 0),
          project_id: r.project_id,
          project_address: r.projects?.address ?? null,
          bank_account_id: r.bank_account_id,
          bank_account_label: r.accounts
            ? `${r.accounts.code} - ${r.accounts.name}`
            : null,
          company_name: r.companies?.company_name ?? null,
          check_number: r.check_number ?? null,
          memo: r.memo ?? null,
          reconciled: !!r.reconciled,
          reconciliation_id: r.reconciliation_id ?? null,
        };

        const existing = groups.get(batchId);
        if (existing) {
          existing.deposits.push(deposit);
          existing.count += 1;
          existing.total += deposit.amount;
          // Earliest created_at in group wins as "savedAt" — they're all
          // written together so this is effectively the same moment anyway.
          if (r.created_at && r.created_at < existing.savedAt) {
            existing.savedAt = r.created_at;
          }
        } else {
          groups.set(batchId, {
            batchId,
            savedAt: r.created_at,
            savedBy: r.created_by ?? null,
            savedByName: r.created_by ? usersMap[r.created_by] ?? null : null,
            count: 1,
            projectCount: 0,
            total: deposit.amount,
            deposits: [deposit],
          });
        }
      }

      const list = Array.from(groups.values()).map((g) => ({
        ...g,
        projectCount: new Set(g.deposits.map((d) => d.project_id).filter(Boolean))
          .size,
      }));

      list.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
      return list;
    },
    staleTime: 15_000,
  });
}
