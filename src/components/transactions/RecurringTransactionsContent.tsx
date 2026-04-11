import { useState } from "react";
import { useRecurringTransactions, type RecurringTransaction } from "@/hooks/useRecurringTransactions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DeleteButton } from "@/components/ui/delete-button";
import { Trash2, Play, Pause, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { toDateLocal } from "@/utils/dateOnly";

interface RecurringTransactionsContentProps {
  projectId?: string;
  onEnterTransaction?: (rt: RecurringTransaction) => void;
}

export function RecurringTransactionsContent({ projectId, onEnterTransaction }: RecurringTransactionsContentProps) {
  const { recurringTransactions, dueTransactions, isLoading, deleteRecurring, toggleActive } = useRecurringTransactions();
  const [typeFilter, setTypeFilter] = useState<string>("all");

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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Next Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((rt) => {
              const amount = rt.template_data?.amount ?? 0;
              const due = isDue(rt);
              return (
                <TableRow key={rt.id} className={due ? "bg-amber-50 dark:bg-amber-950/20" : ""}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {due && <AlertCircle className="h-4 w-4 text-amber-600" />}
                      {rt.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{formatType(rt.transaction_type)}</Badge>
                  </TableCell>
                  <TableCell>${Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell>{formatFrequency(rt.frequency)}</TableCell>
                  <TableCell>
                    {format(toDateLocal(rt.next_date), "MM/dd/yyyy")}
                  </TableCell>
                  <TableCell>
                    {rt.is_active ? (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Paused</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {due && onEnterTransaction && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEnterTransaction(rt)}
                        >
                          Enter Now
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleActive.mutate({ id: rt.id, is_active: !rt.is_active })}
                        title={rt.is_active ? "Pause" : "Resume"}
                      >
                        {rt.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <DeleteButton
                        onDelete={() => deleteRecurring.mutateAsync(rt.id)}
                        title="Delete Recurring Transaction"
                        description={`Are you sure you want to delete "${rt.name}"? This cannot be undone.`}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
