import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ChevronDown, Divide, MoreHorizontal, Plus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CheckAttachmentUpload, type CheckAttachment } from "@/components/checks/CheckAttachmentUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { DateInputPicker } from "@/components/ui/date-input-picker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { TableRowActions } from "@/components/ui/table-row-actions";
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
import { checkGroupTotal, groupCheckRows, splitCheckAmount } from "@/lib/multiCheckGroups";

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
  lotId: string;
  /** Rows sharing a splitGroupId save as ONE check with one line per lot. */
  splitGroupId: string;
  attachments: CheckAttachment[];
}

interface ProjectLotLite {
  id: string;
  project_id: string;
  lot_number: number;
  lot_name: string | null;
}

// Draft persistence: in-memory cache keeps File attachments across in-app
// navigation; localStorage keeps the text fields across a full page reload.
const DRAFT_KEY = "multi_check_draft_v1";
let draftCache: { rows: Row[]; defaultDate: string; entryType: Row["entryType"] } | null = null;

const loadDraft = () => {
  if (draftCache) return draftCache;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    return {
      defaultDate: d.defaultDate,
      entryType: d.entryType,
      rows: (d.rows || []).map((r: any) => ({
        ...r,
        checkDate: new Date(r.checkDate),
        lotId: r.lotId || "",
        splitGroupId: r.splitGroupId || "",
        attachments: [],
      })),
    };
  } catch {
    return null;
  }
};

const STATUS_ORDER = ["Under Construction", "Permitting", "In Design"] as const;

const blankRow = (defaultDate: Date, type: Row["entryType"] = "cost_code"): Row => ({
  id: crypto.randomUUID(),
  projectId: "",
  checkDate: defaultDate,
  bankAccountId: "",
  bankAccountLabel: "",
  payToCompanyId: "",
  payToName: "",
  checkNumber: "",
  entryType: type,
  accountId: "",
  accountLabel: "",
  costCodeId: "",
  costCodeLabel: "",
  description: "",
  amount: "",
  lotId: "",
  splitGroupId: "",
  attachments: [],
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

  const [initialDraft] = useState(loadDraft);
  const [defaultDate, setDefaultDate] = useState<Date>(() =>
    initialDraft?.defaultDate ? new Date(initialDraft.defaultDate) : new Date(),
  );
  const [entryType, setEntryType] = useState<Row["entryType"]>(
    initialDraft?.entryType || "cost_code",
  );
  const [rows, setRows] = useState<Row[]>(() =>
    initialDraft?.rows?.length
      ? initialDraft.rows
      : Array.from({ length: 5 }, () => blankRow(new Date(), "cost_code")),
  );
  const [amountEdits, setAmountEdits] = useState<Record<string, string>>({});
  const visibleGroups = useMemo(() => groupCheckRows(rows), [rows]);

  // Persist the draft on every change so leaving the page never loses work.
  useEffect(() => {
    draftCache = { rows, defaultDate: defaultDate.toISOString(), entryType };
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          defaultDate: defaultDate.toISOString(),
          entryType,
          rows: rows.map(({ attachments, ...r }) => ({
            ...r,
            checkDate: r.checkDate.toISOString(),
          })),
        }),
      );
    } catch {
      /* storage full / unavailable — in-memory cache still works */
    }
  }, [rows, defaultDate, entryType]);

  // Lots for every project picked on the page (one query)
  const pickedProjectIds = useMemo(
    () => Array.from(new Set(rows.map((r) => r.projectId).filter(Boolean))).sort(),
    [rows],
  );
  const { data: lotsByProject = {} } = useQuery({
    queryKey: ["multi-check-lots", pickedProjectIds],
    enabled: pickedProjectIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_lots")
        .select("id, project_id, lot_number, lot_name")
        .in("project_id", pickedProjectIds)
        .order("lot_number", { ascending: true });
      if (error) throw error;
      const map: Record<string, ProjectLotLite[]> = {};
      for (const l of (data || []) as ProjectLotLite[]) (map[l.project_id] ||= []).push(l);
      return map;
    },
  });
  const lotsFor = (projectId: string) => lotsByProject[projectId] || [];
  const showAddressColumn = rows.some((r) => lotsFor(r.projectId).length > 1);

  // Same penny-precise even split as Enter Bills / Write Checks
  const splitRowEvenly = (rowId: string) => {
    setRows((rs) => {
      const row = rs.find((r) => r.id === rowId);
      if (!row) return rs;
      const lots = lotsFor(row.projectId);
      if (lots.length < 2) return rs;
      const amounts = splitCheckAmount(row.amount, lots.length);
      const groupId = crypto.randomUUID();
      const newRows: Row[] = lots.map((lot, i) => ({
        ...row,
        id: i === 0 ? row.id : crypto.randomUUID(),
        lotId: lot.id,
        splitGroupId: groupId,
        attachments: i === 0 ? row.attachments : [],
        amount: amounts[i],
      }));
      const idx = rs.findIndex((r) => r.id === rowId);
      return [...rs.slice(0, idx), ...newRows, ...rs.slice(idx + 1)];
    });
  };

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

  // Header fields stay in sync across rows of the same split check
  const SHARED_KEYS: (keyof Row)[] = [
    "projectId", "checkDate", "bankAccountId", "bankAccountLabel", "payToCompanyId",
    "payToName", "checkNumber", "accountId", "accountLabel", "costCodeId",
    "costCodeLabel", "description",
  ];
  const updateRow = (id: string, patch: Partial<Row>) =>
    setRows((rs) => {
      const target = rs.find((r) => r.id === id);
      if (!target) return rs;
      const group = target.splitGroupId
        ? rs.filter((r) => r.splitGroupId === target.splitGroupId) : [target];
      // A new project must become one unsplit check, never orphan detail rows.
      if ("projectId" in patch && target.splitGroupId) {
        return rs.flatMap((r) => {
          if (r.id === id) return [{ ...r, amount: checkGroupTotal(group).toFixed(2),
            attachments: group.flatMap((g) => g.attachments), ...patch }];
          return r.splitGroupId === target.splitGroupId ? [] : [r];
        });
      }
      const amounts = "amount" in patch && target.splitGroupId
        ? splitCheckAmount(patch.amount || "", group.length) : undefined;
      const shared: Partial<Row> = {};
      for (const k of SHARED_KEYS) if (k in patch) (shared as any)[k] = (patch as any)[k];
      return rs.map((r) => {
        if (target.splitGroupId && r.splitGroupId === target.splitGroupId) {
          return { ...r, ...shared,
            ...(amounts ? { amount: amounts[group.findIndex((g) => g.id === r.id)] } : {}),
            ...("attachments" in patch ? { attachments: r.id === id ? patch.attachments || [] : [] } : {}),
          };
        }
        if (r.id === id) return { ...r, ...patch };
        return r;
      });
    });

  const handleProjectPick = (id: string, projectId: string) => {
    const defaultBankId = projectBankDefaults[projectId] || "";
    const acct = (accounts || []).find((a: any) => a.id === defaultBankId);
    updateRow(id, {
      projectId,
      lotId: "",
      splitGroupId: "",
      bankAccountId: defaultBankId,
      bankAccountLabel: acct ? labelForAccount(acct) : "",
    });
  };

  const addRow = () => setRows((rs) => [...rs, blankRow(defaultDate, entryType)]);
  const removeRow = (id: string) =>
    setRows((rs) => {
      const target = rs.find((r) => r.id === id);
      if (!target || groupCheckRows(rs).length <= 1) return rs;
      return rs.filter((r) => target.splitGroupId
        ? r.splitGroupId !== target.splitGroupId : r.id !== id);
    });

  const clearAll = () => {
    setAmountEdits({});
    draftCache = null;
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    setRows(Array.from({ length: 5 }, () => blankRow(defaultDate, entryType)));
  };

  const handleEntryTypeChange = (type: Row["entryType"]) => {
    setEntryType(type);
    setRows((rs) =>
      rs.map((r) => ({
        ...r,
        entryType: type,
        accountId: "",
        accountLabel: "",
        costCodeId: "",
        costCodeLabel: "",
      })),
    );
  };

  const total = useMemo(
    () => checkGroupTotal(rows),
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

    // Collapse split rows into one check each
    const groups = groupCheckRows(nonEmpty);

    groups.forEach((group, idx) => {
      const r = group[0];
      const rowLabel = `Check ${idx + 1}`;
      const lineCents = group.map((g) => Math.round((Number(g.amount) || 0) * 100));
      if (group.some((g) => lotsFor(g.projectId).length > 1 && !g.lotId))
        errors.push(`${rowLabel}: pick an address or split it.`);
      if (!r.projectId) errors.push(`${rowLabel}: pick a project.`);
      if (!r.bankAccountId) errors.push(`${rowLabel}: pick a pay-from bank account.`);
      if (!r.payToName) errors.push(`${rowLabel}: pick who the check is paid to.`);
      if (r.entryType === "cost_code") {
        if (!r.costCodeId) errors.push(`${rowLabel}: pick a cost code.`);
      } else if (!r.accountId) {
        errors.push(`${rowLabel}: pick an account.`);
      }
      const amt = lineCents.reduce((a, b) => a + b, 0) / 100;
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
          lines: group.map((g, i) => ({ lotId: g.lotId || undefined, amount: lineCents[i] / 100 })),
          files: group.flatMap((g) => g.attachments.map((a) => a.file).filter(Boolean) as File[]),
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
        description: `${e?.message || "Something went wrong saving the batch."} Your files are retained. Click Save Batch again to resume without duplicating saved checks.`,
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={addRow}>Add Row</DropdownMenuItem>
              <DropdownMenuItem onClick={clearAll} disabled={saveMutation.isPending}>
                Clear All
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
              <TableHead className="w-[220px]">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-1 font-medium hover:text-foreground transition-colors"
                    >
                      {entryType === "cost_code" ? "Cost Code" : "Account"}
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="bg-popover z-50">
                    <DropdownMenuItem onClick={() => handleEntryTypeChange("cost_code")}>
                      Cost Code
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleEntryTypeChange("account")}>
                      Account
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[110px] text-right">Amount</TableHead>
              {showAddressColumn && <TableHead className="w-[190px]">Address</TableHead>}
              <TableHead className="w-[110px]">Files</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleGroups.map((group) => {
              const r = group[0];
              const split = !!r.splitGroupId;
              const lotMap = new Map<string, { name: string; order: number; cents: number }>();
              for (const line of group) {
                if (!line.lotId) continue;
                const lot = lotsFor(r.projectId).find((l) => l.id === line.lotId);
                const existing = lotMap.get(line.lotId);
                const cents = Math.round((Number(line.amount) || 0) * 100);
                if (existing) existing.cents += cents;
                else lotMap.set(line.lotId, {
                  name: lot?.lot_name || (lot ? `Lot ${lot.lot_number}` : "Address"),
                  order: lot?.lot_number ?? Number.MAX_SAFE_INTEGER, cents,
                });
              }
              const breakdown = Array.from(lotMap.values()).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
              return (
              <TableRow key={r.id} className="h-11 align-top">
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
                    aria-label="Check amount"
                    value={split ? amountEdits[r.id] ?? checkGroupTotal(group).toFixed(2) : r.amount}
                    onChange={(e) => {
                      if (split) setAmountEdits((edits) => ({ ...edits, [r.id]: e.target.value }));
                      updateRow(r.id, { amount: e.target.value });
                    }}
                    onBlur={() => {
                      if (!split && r.amount.trim() && Number.isFinite(Number(r.amount))) {
                        updateRow(r.id, { amount: Number(r.amount).toFixed(2) });
                      }
                      setAmountEdits((edits) => {
                        const next = { ...edits }; delete next[r.id]; return next;
                      });
                    }}
                    inputMode="decimal"
                    placeholder="0.00"
                    className="text-right"
                  />
                </TableCell>
                {showAddressColumn && (
                  <TableCell>
                    {split ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" aria-label={`${breakdown.length} lots allocation`}>
                              {breakdown.length > 1 ? `+${breakdown.length}` : breakdown[0]?.name || "—"}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <div className="space-y-2">
                              <div className="font-medium text-xs">{r.entryType === "cost_code" ? r.costCodeLabel : r.accountLabel}</div>
                              <div className="max-h-80 overflow-y-auto pl-2 space-y-0.5">
                                {breakdown.map((lot, i) => (
                                  <div key={i} className="flex justify-between gap-4 text-xs">
                                    <span className="text-muted-foreground">{lot.name}:</span>
                                    <span>{fmtMoney(lot.cents / 100)}</span>
                                  </div>
                                ))}
                              </div>
                              <div className="border-t pt-1 flex justify-between gap-4 font-medium text-xs">
                                <span>Total:</span><span>{fmtMoney(checkGroupTotal(group))}</span>
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : lotsFor(r.projectId).length > 1 ? (
                      <div className="flex items-center gap-1">
                        <Select
                          value={r.lotId || ""}
                          onValueChange={(v) => updateRow(r.id, { lotId: v })}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {lotsFor(r.projectId).map((lot) => (
                              <SelectItem key={lot.id} value={lot.id}>
                                {lot.lot_name || `Lot ${lot.lot_number}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                onClick={() => splitRowEvenly(r.id)}
                                size="sm"
                                variant="outline"
                                className="shrink-0"
                                aria-label="Split evenly across all addresses"
                                disabled={!!r.lotId || (Number(r.amount) || 0) <= 0}
                              >
                                <Divide className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Split evenly across all addresses</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    ) : null}
                  </TableCell>
                )}
                <TableCell>
                  <CheckAttachmentUpload
                    inputId={`multi-check-file-${r.id}`}
                    compact
                    attachments={group.flatMap((g) => g.attachments)}
                    onAttachmentsChange={(a) => updateRow(r.id, { attachments: a })}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <TableRowActions
                    actions={[
                      {
                        label: "Delete",
                        variant: "destructive",
                        onClick: () => removeRow(r.id),
                         disabled: visibleGroups.length === 1,
                      },
                    ]}
                  />
                </TableCell>
              </TableRow>
            );
            })}
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
