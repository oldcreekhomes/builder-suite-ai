import { useMemo, useState, useEffect } from "react";
import { format } from "date-fns";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInputPicker } from "@/components/ui/date-input-picker";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AccountSearchInputInline } from "@/components/AccountSearchInputInline";
import { VendorSearchInput } from "@/components/VendorSearchInput";
import { useProjects, Project } from "@/hooks/useProjects";
import { ProjectPickerPopover } from "@/components/projects/ProjectPickerPopover";
import { useAccounts } from "@/hooks/useAccounts";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useMultiDepositBatchSave,
  MultiDepositRowInput,
} from "@/hooks/useMultiDepositBatchSave";
import { toast } from "@/hooks/use-toast";

interface Row {
  id: string;
  projectId: string;
  depositDate: Date;
  bankAccountId: string;
  receivedFromCompanyId: string;
  receivedFromName: string;
  checkNumber: string;
  accountId: string;
  accountLabel: string;
  description: string;
  amount: string;
}

const STATUS_ORDER = ["Under Construction", "Permitting", "In Design"] as const;

const blankRow = (defaultDate: Date): Row => ({
  id: crypto.randomUUID(),
  projectId: "",
  depositDate: defaultDate,
  bankAccountId: "",
  receivedFromCompanyId: "",
  receivedFromName: "",
  checkNumber: "",
  accountId: "",
  accountLabel: "",
  description: "",
  amount: "",
});

const fmtMoney = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export function MultiDepositTable() {
  const { data: projects = [] } = useProjects();
  const { accounts } = useAccounts();
  const queryClient = useQueryClient();
  const saveMutation = useMultiDepositBatchSave();

  const [defaultDate, setDefaultDate] = useState<Date>(new Date());
  const [rows, setRows] = useState<Row[]>(() =>
    Array.from({ length: 5 }, () => blankRow(new Date())),
  );

  // Group active projects the same way Active Jobs table does
  const groupedProjects = useMemo(() => {
    const active = projects.filter(
      (p) =>
        p.status !== "Completed" &&
        p.status !== "Template" &&
        p.status !== "Permanently Closed",
    );
    const groups: Record<string, Project[]> = {};
    for (const p of active) {
      const status = p.status || "In Design";
      (groups[status] ||= []).push(p);
    }
    for (const key of Object.keys(groups)) {
      groups[key].sort(
        (a, b) => (a.display_order ?? 999) - (b.display_order ?? 999),
      );
    }
    return groups;
  }, [projects]);

  const orderedStatuses = useMemo(() => {
    const keys = Object.keys(groupedProjects);
    return keys.sort((a, b) => {
      const ai = STATUS_ORDER.indexOf(a as any);
      const bi = STATUS_ORDER.indexOf(b as any);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  }, [groupedProjects]);

  // Preload per-project deposit-account defaults for autofill on project pick
  const projectIds = useMemo(
    () => Object.values(groupedProjects).flat().map((p) => p.id),
    [groupedProjects],
  );

  const { data: projectDepositDefaults = {} } = useQuery({
    queryKey: ["multi-deposit-default-banks", projectIds],
    enabled: projectIds.length > 0,
    queryFn: async () => {
      const [dep, bank] = await Promise.all([
        supabase
          .from("project_default_deposit_accounts" as any)
          .select("project_id, account_id")
          .in("project_id", projectIds),
        supabase
          .from("project_default_bank_accounts" as any)
          .select("project_id, account_id")
          .in("project_id", projectIds),
      ]);
      const map: Record<string, string> = {};
      for (const r of (bank.data as any[]) || []) map[r.project_id] = r.account_id;
      for (const r of (dep.data as any[]) || []) map[r.project_id] = r.account_id;
      return map;
    },
  });

  const bankAccounts = useMemo(
    () =>
      (accounts || []).filter((a: any) => {
        const type = String(a.type || "").toLowerCase();
        const subtype = String(a.subtype || "").toLowerCase();
        return type === "asset" && (subtype === "bank" || subtype === "" || subtype === "cash");
      }),
    [accounts],
  );

  const updateRow = (id: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const handleProjectPick = (id: string, projectId: string) => {
    const defaultBankId = projectDepositDefaults[projectId] || "";
    updateRow(id, { projectId, bankAccountId: defaultBankId });
  };

  const addRow = () => setRows((rs) => [...rs, blankRow(defaultDate)]);
  const removeRow = (id: string) =>
    setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.id !== id) : rs));

  const clearAll = () =>
    setRows(Array.from({ length: 5 }, () => blankRow(defaultDate)));

  const total = useMemo(
    () => rows.reduce((s, r) => s + (Number(r.amount) || 0), 0),
    [rows],
  );

  const isRowEmpty = (r: Row) =>
    !r.projectId && !r.accountId && !r.amount && !r.receivedFromName && !r.description && !r.checkNumber;

  const handleSave = async () => {
    const nonEmpty = rows.filter((r) => !isRowEmpty(r));
    if (nonEmpty.length === 0) {
      toast({ title: "Nothing to save", description: "Fill in at least one row." });
      return;
    }

    const errors: string[] = [];
    const payload: MultiDepositRowInput[] = [];

    nonEmpty.forEach((r, idx) => {
      const rowLabel = `Row ${idx + 1}`;
      if (!r.projectId) errors.push(`${rowLabel}: pick a project.`);
      if (!r.bankAccountId) errors.push(`${rowLabel}: pick a deposit-to bank account.`);
      if (!r.accountId) errors.push(`${rowLabel}: pick an account.`);
      const amt = Number(r.amount);
      if (!amt || amt <= 0) errors.push(`${rowLabel}: enter an amount greater than 0.`);
      if (errors.length === 0) {
        payload.push({
          projectId: r.projectId,
          depositDate: format(r.depositDate, "yyyy-MM-dd"),
          bankAccountId: r.bankAccountId,
          receivedFromCompanyId: r.receivedFromCompanyId || undefined,
          receivedFromName: r.receivedFromName || undefined,
          checkNumber: r.checkNumber || undefined,
          accountId: r.accountId,
          description: r.description || undefined,
          amount: amt,
        });
      }
    });

    if (errors.length > 0) {
      toast({
        title: "Fix these rows before saving",
        description: errors.slice(0, 5).join("\n"),
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await saveMutation.mutateAsync(payload);
      const projectCount = new Set(payload.map((p) => p.projectId)).size;
      toast({
        title: "Batch saved",
        description: `Saved ${result.count} deposits across ${projectCount} project${projectCount === 1 ? "" : "s"}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["deposits"] });
      queryClient.invalidateQueries({ queryKey: ["multi-deposit-batches"] });
      clearAll();
    } catch (e: any) {
      toast({
        title: "Save failed",
        description: e?.message || "Something went wrong saving the batch.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="rounded-lg border bg-card">
      <div className="p-4 border-b flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold">Enter Multiple Deposits</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Each row is one deposit for one project. All rows save together as one batch.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Default Date</label>
            <DateInputPicker
              date={defaultDate}
              onDateChange={(d) => d && setDefaultDate(d)}
            />
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Total:&nbsp;</span>
            <span className="font-semibold">{fmtMoney(total)}</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[220px]">Project</TableHead>
              <TableHead className="w-[140px]">Date</TableHead>
              <TableHead className="w-[200px]">Deposit To (Bank)</TableHead>
              <TableHead className="w-[200px]">Received From</TableHead>
              <TableHead className="w-[110px]">Check #</TableHead>
              <TableHead className="w-[220px]">Account</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[140px] text-right">Amount</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} className="align-top">
                <TableCell>
                  <ProjectPickerPopover
                    value={r.projectId}
                    onSelect={(p) => handleProjectPick(r.id, p.id)}
                    placeholder="Select project…"
                  />
                </TableCell>
                <TableCell>
                  <DateInputPicker
                    date={r.depositDate}
                    onDateChange={(d) => d && updateRow(r.id, { depositDate: d })}
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={r.bankAccountId}
                    onValueChange={(v) => updateRow(r.id, { bankAccountId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Bank…" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[400px]">
                      {bankAccounts.map((a: any) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.code} - {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <VendorSearchInput
                    value={r.receivedFromCompanyId}
                    displayValue={r.receivedFromName}
                    onChange={(v) => updateRow(r.id, { receivedFromCompanyId: v })}
                    onCompanySelect={(c: any) =>
                      updateRow(r.id, {
                        receivedFromCompanyId: c.id || "",
                        receivedFromName: c.company_name || "",
                      })
                    }
                    placeholder="Optional"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={r.checkNumber}
                    onChange={(e) => updateRow(r.id, { checkNumber: e.target.value })}
                    placeholder="—"
                  />
                </TableCell>
                <TableCell>
                  <AccountSearchInputInline
                    value={r.accountLabel}
                    onChange={(v) => updateRow(r.id, { accountLabel: v })}
                    onAccountSelect={(a) =>
                      updateRow(r.id, {
                        accountId: a.id,
                        accountLabel: `${a.code} - ${a.name}`,
                      })
                    }
                    projectId={r.projectId || undefined}
                    placeholder="Account…"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={r.description}
                    onChange={(e) => updateRow(r.id, { description: e.target.value })}
                    placeholder="Description"
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Input
                    value={r.amount}
                    onChange={(e) => updateRow(r.id, { amount: e.target.value })}
                    inputMode="decimal"
                    placeholder="0.00"
                    className="text-right"
                  />
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRow(r.id)}
                    disabled={rows.length === 1}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="p-4 border-t flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" onClick={addRow}>
          <Plus className="h-4 w-4 mr-1" /> Add Row
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={clearAll} disabled={saveMutation.isPending}>
            Clear
          </Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving…" : "Save Batch"}
          </Button>
        </div>
      </div>
    </div>
  );
}
