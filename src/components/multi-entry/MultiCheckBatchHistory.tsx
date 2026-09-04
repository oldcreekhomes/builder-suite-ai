import { useState } from "react";
import { format } from "date-fns";
import { ChevronDown, ChevronRight, Loader2, Lock, Trash2 } from "lucide-react";
import { useMultiCheckBatches } from "@/hooks/useMultiCheckBatches";
import { useChecks } from "@/hooks/useChecks";
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

export function MultiCheckBatchHistory() {
  const { data: batches = [], isLoading } = useMultiCheckBatches();
  const { deleteCheck } = useChecks();
  const queryClient = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteBatch = async () => {
    const batch = batches.find((b) => b.batchId === pendingDelete);
    if (!batch) return;

    const locked = batch.checks.filter((c) => c.reconciled || !!c.reconciliation_id);
    if (locked.length > 0) {
      toast({
        title: "Cannot delete batch",
        description: `${locked.length} check(s) in this batch are reconciled. Undo the reconciliation first.`,
        variant: "destructive",
      });
      setPendingDelete(null);
      return;
    }

    setDeleting(true);
    let failed = 0;
    for (const c of batch.checks) {
      try {
        await deleteCheck.mutateAsync(c.id);
      } catch (e) {
        console.error("[multi-check] delete failed", c.id, e);
        failed += 1;
      }
    }
    setDeleting(false);
    setPendingDelete(null);
    queryClient.invalidateQueries({ queryKey: ["multi-check-batches"] });
    queryClient.invalidateQueries({ queryKey: ["checks"] });

    if (failed === 0) {
      toast({ title: "Batch deleted", description: `Removed ${batch.checks.length} checks.` });
    } else {
      toast({
        title: "Partial delete",
        description: `${batch.checks.length - failed} removed, ${failed} failed.`,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="rounded-lg border bg-card">
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold">Multiple Checks Batches</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Every save from this page appears here as one batch. Expand a row to see the individual checks.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-8 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading batches…
        </div>
      ) : batches.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">
          No batches yet. Checks saved from this page will show here.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Saved At</TableHead>
              <TableHead>Saved By</TableHead>
              <TableHead className="text-right"># Checks</TableHead>
              <TableHead className="text-right"># Projects</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-center w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batches.map((b) => {
              const isOpen = openId === b.batchId;
              const hasLocked = b.checks.some((c) => c.reconciled || !!c.reconciliation_id);
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
                        title={hasLocked ? "Some checks are reconciled" : "Delete batch"}
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
                                <TableHead>Pay To</TableHead>
                                <TableHead>Check #</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {b.checks.map((c) => (
                                <TableRow
                                  key={c.id}
                                  className="cursor-pointer"
                                  onClick={() => {
                                    if (c.project_id) {
                                      window.location.href = `/project/${c.project_id}/accounting/transactions?tab=write-checks&checkId=${c.id}`;
                                    }
                                  }}
                                >
                                  <TableCell>{format(new Date(c.check_date), "MM/dd/yyyy")}</TableCell>
                                  <TableCell>{c.project_address || "—"}</TableCell>
                                  <TableCell>{c.bank_account_label || "—"}</TableCell>
                                  <TableCell>{c.pay_to || "—"}</TableCell>
                                  <TableCell>{c.check_number || "—"}</TableCell>
                                  <TableCell className="truncate max-w-[240px]">{c.memo || "—"}</TableCell>
                                  <TableCell className="text-right">{fmtMoney(c.amount)}</TableCell>
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
              This removes every check in the batch from every project. This cannot be undone.
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
