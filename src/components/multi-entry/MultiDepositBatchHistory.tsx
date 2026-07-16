import { useState } from "react";
import { format } from "date-fns";
import { ChevronDown, ChevronRight, Loader2, Lock, Trash2 } from "lucide-react";
import { useMultiDepositBatches } from "@/hooks/useMultiDepositBatches";
import { useDeposits } from "@/hooks/useDeposits";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const fmtMoney = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export function MultiDepositBatchHistory() {
  const { data: batches = [], isLoading } = useMultiDepositBatches();
  const { deleteDeposit } = useDeposits();
  const queryClient = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteBatch = async () => {
    const batch = batches.find((b) => b.batchId === pendingDelete);
    if (!batch) return;

    const locked = batch.deposits.filter((d) => d.reconciled || !!d.reconciliation_id);
    if (locked.length > 0) {
      toast({
        title: "Cannot delete batch",
        description: `${locked.length} deposit(s) in this batch are reconciled. Undo the reconciliation first.`,
        variant: "destructive",
      });
      setPendingDelete(null);
      return;
    }

    setDeleting(true);
    let failed = 0;
    for (const d of batch.deposits) {
      try {
        await deleteDeposit.mutateAsync(d.id);
      } catch (e) {
        console.error("[multi-deposit] delete failed", d.id, e);
        failed += 1;
      }
    }
    setDeleting(false);
    setPendingDelete(null);
    queryClient.invalidateQueries({ queryKey: ["multi-deposit-batches"] });
    queryClient.invalidateQueries({ queryKey: ["deposits"] });

    if (failed === 0) {
      toast({ title: "Batch deleted", description: `Removed ${batch.deposits.length} deposits.` });
    } else {
      toast({
        title: "Partial delete",
        description: `${batch.deposits.length - failed} removed, ${failed} failed.`,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="rounded-lg border bg-card">
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold">Multiple Deposits Batches</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Every save from this page appears here as one batch. Expand a row to see the individual deposits.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-8 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading batches…
        </div>
      ) : batches.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">
          No batches yet. Deposits saved from this page will show here.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Saved At</TableHead>
              <TableHead>Saved By</TableHead>
              <TableHead className="text-right"># Deposits</TableHead>
              <TableHead className="text-right"># Projects</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-center w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batches.map((b) => {
              const isOpen = openId === b.batchId;
              const hasLocked = b.deposits.some((d) => d.reconciled || !!d.reconciliation_id);
              return (
                <>
                  <TableRow
                    key={b.batchId}
                    className="cursor-pointer"
                    onClick={() => setOpenId(isOpen ? null : b.batchId)}
                  >
                    <TableCell>
                      {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </TableCell>
                    <TableCell>
                      {b.savedAt ? format(new Date(b.savedAt), "MMM d, yyyy h:mm a") : "—"}
                    </TableCell>
                    <TableCell>{b.savedByName || "—"}</TableCell>
                    <TableCell className="text-right">{b.count}</TableCell>
                    <TableCell className="text-right">{b.projectCount}</TableCell>
                    <TableCell className="text-right font-medium">{fmtMoney(b.total)}</TableCell>
                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={hasLocked}
                        onClick={() => setPendingDelete(b.batchId)}
                        title={hasLocked ? "Some deposits are reconciled" : "Delete batch"}
                      >
                        {hasLocked ? (
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-destructive" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                  {isOpen && (
                    <TableRow>
                      <TableCell colSpan={7} className="bg-muted/30 p-0">
                        <div className="p-3">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Project</TableHead>
                                <TableHead>Bank</TableHead>
                                <TableHead>Received From</TableHead>
                                <TableHead>Check #</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {b.deposits.map((d) => (
                                <TableRow
                                  key={d.id}
                                  className="cursor-pointer"
                                  onClick={() => {
                                    if (d.project_id) {
                                      window.location.href = `/project/${d.project_id}/accounting/transactions?tab=make-deposits&depositId=${d.id}`;
                                    }
                                  }}
                                >
                                  <TableCell>{format(new Date(d.deposit_date), "MM/dd/yyyy")}</TableCell>
                                  <TableCell>{d.project_address || "—"}</TableCell>
                                  <TableCell>{d.bank_account_label || "—"}</TableCell>
                                  <TableCell>{d.company_name || d.memo || "—"}</TableCell>
                                  <TableCell>{d.check_number || "—"}</TableCell>
                                  <TableCell className="truncate max-w-[240px]">{d.memo || "—"}</TableCell>
                                  <TableCell className="text-right">{fmtMoney(d.amount)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>
      )}

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this batch?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes every deposit in the batch from every project. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteBatch();
              }}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete Batch"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
