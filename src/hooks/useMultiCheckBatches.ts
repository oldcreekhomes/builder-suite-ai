import { enteredOrder } from "@/lib/multiCheckBatchProgress";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { batchedIn, fetchAllRows } from "@/lib/supabasePaginate";
import { resolveAccountName } from "@/hooks/useProjectAccountNames";

export interface MultiCheckDetailLine {
  id: string;
  check_id: string;
  line_number: number;
  amount: number;
  account_id: string | null;
  cost_code_id: string | null;
  lot_id: string | null;
  label: string;
  accounts: { id: string; code: string; name: string } | null;
  cost_codes: { code: string; name: string } | null;
  project_lots: { lot_number: number; lot_name: string | null } | null;
}

export interface MultiCheckFile {
  id: string;
  check_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  content_type: string | null;
}

export interface MultiCheckBatchCheck {
  id: string;
  created_at: string;
  check_date: string;
  amount: number;
  project_id: string | null;
  project_address: string | null;
  bank_account_id: string | null;
  bank_account_label: string | null;
  pay_to: string | null;
  check_number: string | null;
  memo: string | null;
  reconciled: boolean;
  reconciliation_id: string | null;
  lines: MultiCheckDetailLine[];
  files: MultiCheckFile[];
}

export interface MultiCheckBatch {
  batchId: string;
  savedAt: string;
  savedBy: string | null;
  savedByName: string | null;
  count: number;
  projectCount: number;
  total: number;
  checks: MultiCheckBatchCheck[];
}

export function useMultiCheckBatches() {
  return useQuery({
    queryKey: ["multi-check-batches"],
    queryFn: async (): Promise<MultiCheckBatch[]> => {
      // checks table has no PostgREST foreign key relationships to
      // projects/accounts, so fetch plain columns and batch-lookup labels.
      const { data, error } = await supabase
        .from("checks")
        .select(
          `
          id,
          check_date,
          amount,
          project_id,
          bank_account_id,
          pay_to,
          check_number,
          memo,
          reconciled,
          reconciliation_id,
          multi_entry_batch_id,
          created_at,
          created_by
        `,
        )
        .not("multi_entry_batch_id", "is", null)
        .eq("is_reversal", false)
        .is("reversed_at", null)
        .order("created_at", { ascending: false })
        .limit(1000);

      if (error) throw error;

      const rows = (data || []) as any[];
      const checkIds = rows.map((r) => r.id as string);
      // A batch can contain thousands of lot lines: paginate within UUID chunks.
      const detailLines: MultiCheckDetailLine[] = [];
      const files: MultiCheckFile[] = [];
      for (let i = 0; i < checkIds.length; i += 200) {
        const ids = checkIds.slice(i, i + 200);
        const [chunkLines, chunkFiles] = await Promise.all([
          fetchAllRows<MultiCheckDetailLine>(() => supabase.from("check_lines")
            .select("id, check_id, line_number, amount, account_id, cost_code_id, lot_id, accounts(id, code, name), cost_codes(code, name), project_lots(lot_number, lot_name)")
            .in("check_id", ids).order("id")),
          fetchAllRows<MultiCheckFile>(() => supabase.from("check_attachments")
            .select("id, check_id, file_name, file_path, file_size, content_type")
            .in("check_id", ids).order("id")),
        ]);
        detailLines.push(...chunkLines);
        files.push(...chunkFiles);
      }

      const projectIds = Array.from(
        new Set(rows.map((r) => r.project_id).filter(Boolean)),
      ) as string[];
      const accountIds = Array.from(
        new Set(rows.map((r) => r.bank_account_id).filter(Boolean)),
      ) as string[];
      const userIds = Array.from(
        new Set(rows.map((r) => r.created_by).filter(Boolean)),
      ) as string[];

      const [projectsList, accountsList, usersList, overrides] = await Promise.all([
        batchedIn<any>(
          (ids) => supabase.from("projects").select("id, address").in("id", ids),
          projectIds,
        ),
        batchedIn<any>(
          (ids) =>
            supabase.from("accounts").select("id, code, name").in("id", ids),
          accountIds,
        ),
        batchedIn<any>(
          (ids) =>
            supabase
              .from("users")
              .select("id, first_name, last_name")
              .in("id", ids),
          userIds,
        ),
        batchedIn<{ project_id: string; account_id: string; display_name: string }>(
          (ids) => supabase.from("project_account_overrides")
            .select("project_id, account_id, display_name").in("project_id", ids), projectIds,
        ),
      ]);

      const overrideMaps = new Map<string, Map<string, string>>();
      for (const o of overrides) {
        const map = overrideMaps.get(o.project_id) || new Map<string, string>();
        map.set(o.account_id, o.display_name);
        overrideMaps.set(o.project_id, map);
      }
      const linesMap = new Map<string, MultiCheckDetailLine[]>();
      const filesMap = new Map<string, MultiCheckFile[]>();
      const checkProjectMap = new Map(rows.map((r) => [r.id, r.project_id as string]));
      for (const line of detailLines) {
        const account = line.accounts;
        const code = line.cost_codes;
        line.label = code ? `${code.code} - ${code.name}` : account
          ? `${account.code} - ${resolveAccountName(account, overrideMaps.get(checkProjectMap.get(line.check_id) || ""))}` : "—";
        const list = linesMap.get(line.check_id) || [];
        list.push(line); linesMap.set(line.check_id, list);
      }
      for (const list of linesMap.values()) list.sort((a, b) => a.line_number - b.line_number);
      for (const file of files) {
        const list = filesMap.get(file.check_id) || [];
        list.push(file); filesMap.set(file.check_id, list);
      }

      const projectsMap: Record<string, string> = {};
      for (const p of projectsList) projectsMap[p.id] = p.address;
      const accountsMap: Record<string, string> = {};
      for (const a of accountsList) accountsMap[a.id] = `${a.code} - ${a.name}`;
      const usersMap: Record<string, string> = {};
      for (const u of usersList) {
        usersMap[u.id] =
          [u.first_name, u.last_name].filter(Boolean).join(" ") || "";
      }

      const groups = new Map<string, MultiCheckBatch>();
      for (const r of rows) {
        const batchId = r.multi_entry_batch_id as string;
        if (!batchId) continue;

        const check: MultiCheckBatchCheck = {
          id: r.id,
          created_at: r.created_at,
          check_date: r.check_date,
          amount: Number(r.amount || 0),
          project_id: r.project_id,
          project_address: r.project_id
            ? projectsMap[r.project_id] ?? null
            : null,
          bank_account_id: r.bank_account_id,
          bank_account_label: r.bank_account_id
            ? accountsMap[r.bank_account_id] ?? null
            : null,
          pay_to: r.pay_to ?? null,
          check_number: r.check_number ?? null,
          memo: r.memo ?? null,
          reconciled: !!r.reconciled,
          reconciliation_id: r.reconciliation_id ?? null,
          lines: linesMap.get(r.id) || [],
          files: filesMap.get(r.id) || [],
        };

        const existing = groups.get(batchId);
        if (existing) {
          existing.checks.push(check);
          existing.count += 1;
          existing.total += check.amount;
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
            total: check.amount,
            checks: [check],
          });
        }
      }

      const list = Array.from(groups.values()).map((g) => ({
        ...g,
        checks: enteredOrder(g.checks),
        projectCount: new Set(g.checks.map((c) => c.project_id).filter(Boolean))
          .size,
      }));

      list.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
      return list;
    },
    staleTime: 15_000,
  });
}
