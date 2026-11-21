import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRecurringTransactions, type RecurringTransaction } from "@/hooks/useRecurringTransactions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { toDateLocal } from "@/utils/dateOnly";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { CreditCardsContent } from "@/components/transactions/CreditCardsContent";
import { WriteChecksContent } from "@/components/transactions/WriteChecksContent";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const plain = (v: any) => String(v ?? "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim() || "-";

function TruncCell({ text, className = "" }: { text: string; className?: string }) {
  return (
    <TableCell className={`max-w-0 ${className}`}>
      <Tooltip>
        <TooltipTrigger asChild><span className="block truncate">{text}</span></TooltipTrigger>
        <TooltipContent className="max-w-md">{text}</TooltipContent>
      </Tooltip>
    </TableCell>
  );
}

interface RecurringTransactionsContentProps {
  projectId?: string;
  onEnterTransaction?: (rt: RecurringTransaction) => void;
}

export function RecurringTransactionsContent({ projectId, onEnterTransaction }: RecurringTransactionsContentProps) {
  const { recurringTransactions, dueTransactions, isLoading, deleteRecurring, toggleActive } = useRecurringTransactions(projectId);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [editing, setEditing] = useState<RecurringTransaction | null>(null);

  const { data: projectNames = {} } = useQuery({
    queryKey: ["recurring-project-names"],
    enabled: !projectId,
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("id, address");
      const map: Record<string, string> = {};
      (data || []).forEach((p: any) => { map[p.id] = p.address; });
      return map;
    },
  });

  const filtered = typeFilter === "all"
    ? recurringTransactions
    : recurringTransactions.filter((rt) => rt.transaction_type === typeFilter);


  const formatType = (type: string) => {
    switch (type) {
      case "check": return "Check";
      case "credit_card": return "Credit Card";
      case "bill": return "Bill";
      default: return type;
    }
  };

  const vendorOf = (rt: RecurringTransaction) => {
    const td = rt.template_data || {};
    return td.vendor || td.pay_to_name || td.company_name || td.pay_to || td.payee || "-";
  };
  const descriptionOf = (rt: RecurringTransaction) => {
    const memos = [...(rt.recurring_transaction_lines || [])]
      .sort((a, b) => a.line_number - b.line_number)
      .map((l) => (l.memo || "").trim())
      .filter(Boolean);
    return memos.length ? Array.from(new Set(memos)).join(", ") : rt.name;
  };
  const accountOf = (rt: RecurringTransaction) => rt.template_data?.credit_card_account || rt.template_data?.bank_account || "-";
  const typeOf = (rt: RecurringTransaction) => {
    return formatType(rt.transaction_type);
  };
  const accountLabel = typeFilter === "credit_card" ? "Credit Card Account" : typeFilter === "check" ? "Bank Account" : "Account";

  const formatFrequency = (freq: string) => {
    return freq.charAt(0).toUpperCase() + freq.slice(1);
  };

  const isDue = (rt: RecurringTransaction) => {
    return rt.is_active && new Date(rt.next_date + "T00:00:00") <= new Date();
  };

  if (isLoading) {
    return <div className="p-6 text-muted-foreground">Loading recurring transactions...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Memorized Transactions</h2>
          <p className="text-sm text-muted-foreground">
            Manage recurring checks, credit card charges, and bills
          </p>
        </div>
        <div className="flex items-center gap-3">
          {dueTransactions.length > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {dueTransactions.length} due
            </Badge>
          )}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="check">Checks</SelectItem>
              <SelectItem value="credit_card">Credit Cards</SelectItem>
              <SelectItem value="bill">Bills</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          <p>No memorized transactions yet.</p>
          <p className="text-sm mt-1">Use the "Memorize" button on any check, credit card charge, or bill to save it as a recurring template.</p>
        </div>
      ) : (
        <TooltipProvider>
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[14%]">Vendor</TableHead>
              <TableHead className="w-[20%]">Description</TableHead>
              <TableHead className="w-[15%]">{accountLabel}</TableHead>
              <TableHead className="w-[9%]">Reference No.</TableHead>
              {!projectId && <TableHead className="w-[12%]">Project</TableHead>}
              <TableHead className="w-[9%]">Type</TableHead>
              <TableHead className="w-[9%]">Total</TableHead>
              <TableHead className="w-[8%]">Frequency</TableHead>
              <TableHead className="w-[8%]">Next Date</TableHead>
              <TableHead className="w-16 text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((rt) => {
              const amount = rt.template_data?.amount ?? 0;
              const due = isDue(rt);
              const vendor = plain(vendorOf(rt)), desc = plain(descriptionOf(rt)), acct = plain(accountOf(rt)), ref = plain(rt.template_data?.reference_number || rt.template_data?.check_number);
              return (
                <TableRow key={rt.id} className={due ? "bg-amber-50 dark:bg-amber-950/20" : ""}>
                  <TableCell className="font-medium max-w-0">
                    <span className="flex items-center gap-2 min-w-0">
                      {due && <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />}
                      <Tooltip>
                        <TooltipTrigger asChild><span className="truncate">{vendor}</span></TooltipTrigger>
                        <TooltipContent className="max-w-md">{vendor}</TooltipContent>
                      </Tooltip>
                    </span>
                  </TableCell>
                  <TruncCell text={desc} />
                  <TruncCell text={acct} className="text-muted-foreground" />
                  <TruncCell text={ref} />
                  {!projectId && (
                    <TableCell className="max-w-0 truncate text-muted-foreground">
                      {rt.project_id ? (projectNames[rt.project_id] ?? "-") : "-"}
                    </TableCell>
                  )}
                  <TableCell><Badge variant="outline">{typeOf(rt)}</Badge></TableCell>
                  <TableCell>${Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                  <TableCell>{formatFrequency(rt.frequency)}</TableCell>
                  <TableCell>{format(toDateLocal(rt.next_date), "MM/dd/yyyy")}</TableCell>
                  <TableCell className="text-center">
                    <TableRowActions
                      actions={[
                        {
                          label: "Enter Now",
                          onClick: () => onEnterTransaction?.(rt),
                          hidden: !due || !onEnterTransaction,
                        },
                        {
                          label: "Edit",
                          onClick: () => setEditing(rt),
                          hidden: rt.transaction_type !== "credit_card" && rt.transaction_type !== "check",
                        },
                        {
                          label: rt.is_active ? "Pause" : "Resume",
                          onClick: () => toggleActive.mutate({ id: rt.id, is_active: !rt.is_active }),
                          disabled: toggleActive.isPending,
                        },
                        {
                          label: "Delete",
                          variant: "destructive",
                          requiresConfirmation: true,
                          confirmTitle: "Delete Recurring Transaction",
                          confirmDescription: `Are you sure you want to delete "${rt.name}"? This cannot be undone.`,
                          onClick: () => deleteRecurring.mutateAsync(rt.id),
                          isLoading: deleteRecurring.isPending,
                        },
                      ]}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        </TooltipProvider>
      )}
      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="w-[calc(100vw-280px)] max-w-[1320px] max-h-[92vh] overflow-y-auto p-0">
          <DialogTitle className="sr-only">Edit {editing?.name}</DialogTitle>
          {editing && editing.transaction_type === "check" ? (
            <WriteChecksContent
              key={editing.id}
              projectId={editing.project_id || projectId}
              recurringEdit={{ template: editing, onSaved: () => setEditing(null), onCancel: () => setEditing(null) }}
            />
          ) : editing && (
            <CreditCardsContent
              key={editing.id}
              projectId={editing.project_id || projectId}
              recurringEdit={{ template: editing, onSaved: () => setEditing(null), onCancel: () => setEditing(null) }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
