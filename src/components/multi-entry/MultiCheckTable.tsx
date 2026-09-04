import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInputPicker } from "@/components/ui/date-input-picker";
import { TableRowActions } from "@/components/ui/table-row-actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AccountSearchInputInline } from "@/components/AccountSearchInputInline";
import { CostCodeSearchInput } from "@/components/CostCodeSearchInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AccountSearchInput } from "@/components/AccountSearchInput";
import { VendorSearchInput } from "@/components/VendorSearchInput";
import { useProjects, Project } from "@/hooks/useProjects";
import { ProjectPickerPopover } from "@/components/projects/ProjectPickerPopover";
import { useAccounts } from "@/hooks/useAccounts";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useMultiCheckBatchSave,
  MultiCheckRowInput,
} from "@/hooks/useMultiCheckBatchSave";
import { toast } from "@/hooks/use-toast";

interface Row {
  id: string;
  projectId: string;
  checkDate: Date;
  bankAccountId: string;
  bankAccountLabel: string;
  payToCompanyId: string;
  payToName: string;
  checkNumber: string;
  entryType: "account" | "cost_code";
  accountId: string;
  accountLabel: string;
  costCodeId: string;
  costCodeLabel: string;
  description: string;
  amount: string;
}

const STATUS_ORDER = ["Under Construction", "Permitting", "In Design"] as const;

const blankRow = (defaultDate: Date): Row => ({
  id: crypto.randomUUID(),
  projectId: "",
  checkDate: defaultDate,
  bankAccountId: "",
  bankAccountLabel: "",
  payToCompanyId: "",
  payToName: "",
  checkNumber: "",
  entryType: "cost_code",
  accountId: "",
  accountLabel: "",
  costCodeId: "",
  costCodeLabel: "",
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

export function MultiCheckTable() {
  const { data: projects = [] } = useProjects();
  const { accounts } = useAccounts();
  const queryClient = useQueryClient();
  const saveMutation = useMultiCheckBatchSave();

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

  // Preload per-project bank-account defaults for autofill on project pick
  const projectIds = useMemo(
    () => Object.values(groupedProjects).flat().map((p) => p.id),
    [groupedProjects],
  );

  const { data: projectBankDefaults = {} } = useQuery({
    queryKey: ["multi-check-default-banks", projectIds],
    enabled: projectIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("project_default_bank_accounts" as any)
        .select("project_id, account_id")
        .in("project_id", projectIds);
      const map: Record<string, string> = {};
      for (const r of (data as any[]) || []) map[r.project_id] = r.account_id;
      return map;
    },
  });

  const labelForAccount = (a: any) => (a ? `${a.code} - ${a.name}` : "");

  const updateRow = (id: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const handleProjectPick = (id: string, projectId: string) => {
    const defaultBankId = projectBankDefaults[projectId] || "";
    const acct = (accounts || []).find((a: any) => a.id === defaultBankId);
    updateRow(id, {
      projectId,
      bankAccountId: defaultBankId,
      bankAccountLabel: acct ? labelForAccount(acct) : "",
    });
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
    !r.projectId &&
    !r.accountId &&
    !r.costCodeId &&
    !r.amount &&
    !r.payToName &&
    !r.description &&
    !r.checkNumber;

  const handleSave = async () => {
    const nonEmpty = rows.filter((r) => !isRowEmpty(r));
    if (nonEmpty.length === 0) {
      toast({ title: "Nothing to save", description: "Fill in at least one row." });
      return;
    }

    const errors: string[] = [];
    const payload: MultiCheckRowInput[] = [];

    nonEmpty.forEach((r, idx) => {
      const rowLabel = `Row ${idx + 1}`;
      if (!r.projectId) errors.push(`${rowLabel}: pick a project.`);
      if (!r.bankAccountId) errors.push(`${rowLabel}: pick a pay-from bank account.`);
      if (!r.payToName) errors.push(`${rowLabel}: pick who the check is paid to.`);
      if (r.entryType === "cost_code") {
        if (!r.costCodeId) errors.push(`${rowLabel}: pick a cost code.`);
      } else if (!r.accountId) {
        errors.push(`${rowLabel}: pick an account.`);
      }
      const amt = Math.round((Number(r.amount) || 0) * 100) / 100;
      if (!amt || amt <= 0) errors.push(`${rowLabel}: enter an amount greater than 0.`);
      if (errors.length === 0) {
        payload.push({
          projectId: r.projectId,
          checkDate: format(r.checkDate, "yyyy-MM-dd"),
          bankAccountId: r.bankAccountId,
          payToCompanyId: r.payToCompanyId || undefined,
          payToName: r.payToName,
          checkNumber: r.checkNumber || undefined,
          entryType: r.entryType,
          accountId: r.entryType === "account" ? r.accountId : undefined,
          costCodeId: r.entryType === "cost_code" ? r.costCodeId : undefined,
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
        description: `Saved ${result.count} checks across ${projectCount} project${projectCount === 1 ? "" : "s"}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["checks"] });
      queryClient.invalidateQueries({ queryKey: ["multi-check-batches"] });
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
          <h3 className="text-lg font-semibold">Enter Multiple Checks</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Each row is one check for one project. All rows save together as one batch.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Default Date</label>
            <DateInputPicker
              date={defaultDate}
              onDateChange={(d) => {
                if (!d) return;
                setDefaultDate(d);
                setRows((rs) => rs.map((r) => ({ ...r, checkDate: d })));
              }}
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
              <TableHead className="w-[120px]">Date</TableHead>
              <TableHead className="w-[200px]">Pay From (Bank)</TableHead>
              <TableHead className="w-[200px]">Pay To</TableHead>
              <TableHead className="w-[90px]">Check #</TableHead>
              <TableHead className="w-[130px]">Type</TableHead>
              <TableHead className="w-[220px]">Cost Code / Account</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[90px] text-right">Amount</TableHead>
              <TableHead className="w-[70px] text-center">Actions</TableHead>
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
                    date={r.checkDate}
                    onDateChange={(d) => d && updateRow(r.id, { checkDate: d })}
                    hideCalendarButton
                  />
                </TableCell>
                <TableCell>
                  <AccountSearchInput
                    value={r.bankAccountLabel}
                    onChange={(v) => {
                      updateRow(r.id, { bankAccountLabel: v });
                      if (!v) updateRow(r.id, { bankAccountId: "" });
                    }}
                    onAccountSelect={(a: any) =>
                      updateRow(r.id, {
                        bankAccountId: a.id,
                        bankAccountLabel: `${a.code} - ${a.name}`,
                      })
                    }
                    accountType="asset"
                    bankAccountsOnly
                    projectId={r.projectId || undefined}
                    placeholder="Bank…"
                  />
                </TableCell>
                <TableCell>
                  <VendorSearchInput
                    value={r.payToCompanyId}
                    displayValue={r.payToName}
                    onChange={(companyId) =>
                      updateRow(r.id, { payToCompanyId: companyId })
                    }
                    onCompanySelect={(company: any) =>
                      updateRow(r.id, { payToName: company.company_name })
                    }
                    placeholder="Search subcontractors or vendors"
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
                  <Select
                    value={r.entryType}
                    onValueChange={(v) =>
                      updateRow(r.id, {
                        entryType: v as Row["entryType"],
                        accountId: "",
                        accountLabel: "",
                        costCodeId: "",
                        costCodeLabel: "",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="cost_code">Cost Code</SelectItem>
                      <SelectItem value="account">Account</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  {r.entryType === "cost_code" ? (
                    <CostCodeSearchInput
                      value={r.costCodeLabel}
                      onChange={(v) => {
                        updateRow(r.id, { costCodeLabel: v });
                        if (!v) updateRow(r.id, { costCodeId: "" });
                      }}
                      onCostCodeSelect={(cc) =>
                        updateRow(r.id, {
                          costCodeId: cc.id,
                          costCodeLabel: `${cc.code} - ${cc.name}`,
                        })
                      }
                      placeholder="Select cost code..."
                    />
                  ) : (
                    <AccountSearchInputInline
                      value={r.accountLabel}
                      onChange={(v) => {
                        updateRow(r.id, { accountLabel: v });
                        if (!v) updateRow(r.id, { accountId: "" });
                      }}
                      onAccountSelect={(a) =>
                        updateRow(r.id, {
                          accountId: a.id,
                          accountLabel: `${a.code} - ${a.name}`,
                        })
                      }
                      projectId={r.projectId || undefined}
                      placeholder="Select account..."
                    />
                  )}
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
                <TableCell className="text-center">
                  <TableRowActions
                    actions={[
                      {
                        label: "Delete",
                        variant: "destructive",
                        onClick: () => removeRow(r.id),
                        disabled: rows.length === 1,
                      },
                    ]}
                  />
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
