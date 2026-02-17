import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { VendorPurchaseOrder, BilledInvoice } from "@/hooks/useVendorPurchaseOrders";
import { FileText, AlertTriangle, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { formatDateSafe } from "@/utils/dateOnly";

export interface PendingBillLine {
  purchase_order_line_id?: string;
  cost_code_id?: string;
  amount: number;
}

interface PODetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrder: VendorPurchaseOrder | null;
  projectId: string | null | undefined;
  vendorId: string | null | undefined;
  currentBillId?: string;
  currentBillAmount?: number;
  currentBillReference?: string;
  pendingBillLines?: PendingBillLine[];
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(amount);

function BilledAmountWithTooltip({ amount, invoices, currentBillId }: { amount: number; invoices: BilledInvoice[]; currentBillId?: string }) {
  const hasCurrentBillMatch = currentBillId ? invoices.some(inv => inv.bill_id === currentBillId) : false;

  if (invoices.length === 0) {
    return <>{formatCurrency(amount)}</>;
  }

  const totalAmount = invoices.reduce((s, inv) => s + inv.amount, 0);

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn(
            "border-b border-dotted border-current cursor-help",
            hasCurrentBillMatch && "bg-green-100 text-green-700 px-1 rounded"
          )}>
            {formatCurrency(amount)}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            {invoices.map((inv, i) => (
              <div key={`${inv.bill_id}-${i}`}>
                <div className="font-medium text-xs">{inv.reference_number || 'No Reference'}</div>
                <div className="pl-2 space-y-0.5">
                  <div className="flex justify-between gap-4 text-xs">
                    <span className="text-muted-foreground">{inv.bill_date ? formatDateSafe(inv.bill_date, 'MM/dd/yy') : '—'}:</span>
                    <span>${inv.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            ))}
            <div className="border-t pt-1 flex justify-between gap-4 font-medium text-xs">
              <span>Total:</span>
              <span>${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function PODetailsDialog({
  open,
  onOpenChange,
  purchaseOrder,
  currentBillId,
  currentBillAmount,
  currentBillReference,
  pendingBillLines,
}: PODetailsDialogProps) {
  if (!purchaseOrder) return null;

  const isOverBudget = purchaseOrder.remaining < 0;
  const utilizationPercent = purchaseOrder.total_amount > 0
    ? Math.round((purchaseOrder.total_billed / purchaseOrder.total_amount) * 100)
    : 0;
  const isWarning = utilizationPercent >= 90 && utilizationPercent < 100;
  const isHealthy = !isOverBudget && !isWarning;

  const lineItems = purchaseOrder.line_items || [];
  const hasPending = pendingBillLines && pendingBillLines.length > 0;

  // Helper to find pending amount for a PO line
  const getPendingForLine = (lineId: string, lineCostCodeId?: string): number => {
    if (!hasPending) return 0;
    return pendingBillLines.reduce((sum, pbl) => {
      if (pbl.purchase_order_line_id === lineId) return sum + pbl.amount;
      if (!pbl.purchase_order_line_id && pbl.cost_code_id && pbl.cost_code_id === lineCostCodeId) return sum + pbl.amount;
      return sum;
    }, 0);
  };

  const totalPending = hasPending ? pendingBillLines.reduce((s, l) => s + l.amount, 0) : 0;
  const projectedRemaining = purchaseOrder.remaining - totalPending;
  const projectedOverBudget = projectedRemaining < 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <span>PO {purchaseOrder.po_number}</span>
            <div className="ml-auto">
              {isOverBudget ? (
                <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Over Budget</Badge>
              ) : isWarning ? (
                <Badge variant="secondary" className="bg-amber-100 text-amber-700 gap-1"><AlertTriangle className="h-3 w-3" />Near Limit</Badge>
              ) : (
                <Badge variant="secondary" className="bg-green-100 text-green-700 gap-1">On Track</Badge>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Summary Row */}
        <div className={cn("grid gap-4 py-3 border-b", hasPending ? "grid-cols-4" : "grid-cols-3")}>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">PO Total</p>
            <p className="text-sm font-semibold">{formatCurrency(purchaseOrder.total_amount)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Billed to Date</p>
            <p className="text-sm font-semibold">{formatCurrency(purchaseOrder.total_billed)}</p>
          </div>
          {hasPending && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Pending{currentBillReference ? ` (${currentBillReference})` : ''}</p>
              <p className="text-sm font-semibold">{formatCurrency(totalPending)}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Remaining</p>
            <p className={cn("text-sm font-semibold",
              hasPending
                ? projectedOverBudget && "text-destructive"
                : (isOverBudget ? "text-destructive" : isWarning ? "text-amber-700" : "text-green-700")
            )}>
              {formatCurrency(hasPending ? projectedRemaining : purchaseOrder.remaining)}
            </p>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="flex-1 overflow-y-auto">
          {lineItems.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <Table containerClassName="relative w-full">
                <TableHeader>
                  <TableRow>
                     <TableHead className="text-xs">Description</TableHead>
                     <TableHead className="text-xs">Cost Code</TableHead>
                     <TableHead className="text-xs text-right">PO Amount</TableHead>
                     <TableHead className="text-xs text-right">Billed</TableHead>
                     {hasPending && <TableHead className="text-xs text-right">Pending</TableHead>}
                     <TableHead className="text-xs text-right">Remaining</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {lineItems.map((line) => {
                      const linePending = getPendingForLine(line.id, line.cost_code_id);
                      const lineProjectedRemaining = line.remaining - linePending;
                      const lineOver = hasPending ? lineProjectedRemaining < 0 : line.remaining < 0;
                      const lineComplete = hasPending
                        ? (line.total_billed + linePending >= line.amount && line.amount > 0)
                        : (line.total_billed >= line.amount && line.amount > 0);
                      const linePartial = hasPending
                        ? ((line.total_billed + linePending > 0) && (line.total_billed + linePending < line.amount))
                        : (line.total_billed > 0 && line.total_billed < line.amount);

                      return (
                        <TableRow key={line.id}>
                          <TableCell className="text-xs">
                           {line.description || '—'}
                         </TableCell>
                          <TableCell className="text-xs">
                            {line.cost_code ? `${line.cost_code.code}: ${line.cost_code.name}` : '—'}
                         </TableCell>
                         <TableCell className="text-xs text-right">
                           {formatCurrency(line.amount)}
                         </TableCell>
                         <TableCell className="text-xs text-right">
                           <BilledAmountWithTooltip amount={line.total_billed} invoices={line.billed_invoices} currentBillId={currentBillId} />
                         </TableCell>
                         {hasPending && (
                           <TableCell className="text-xs text-right">
                              {linePending > 0 ? (
                                <span className="font-medium">
                                  {formatCurrency(linePending)}
                                </span>
                              ) : '—'}
                           </TableCell>
                         )}
                         <TableCell className={cn("text-xs text-right font-medium",
                            hasPending
                              ? (lineProjectedRemaining < 0 && "text-destructive")
                              : lineOver ? "text-destructive" : lineComplete ? "text-green-700" : linePartial ? "text-amber-700" : ""
                          )}>
                           {formatCurrency(hasPending ? lineProjectedRemaining : line.remaining)}
                         </TableCell>
                        </TableRow>
                     );
                   })}

                   {/* Unallocated Row */}
                   {purchaseOrder.unallocated_billed > 0 && (
                     <TableRow className="border-t border-dashed">
                       <TableCell className="text-xs italic text-muted-foreground">Unallocated</TableCell>
                       <TableCell></TableCell>
                       <TableCell></TableCell>
                       <TableCell className="text-xs text-right text-amber-700 font-medium">
                         <BilledAmountWithTooltip amount={purchaseOrder.unallocated_billed} invoices={purchaseOrder.unallocated_invoices} />
                       </TableCell>
                       {hasPending && <TableCell></TableCell>}
                       <TableCell></TableCell>
                     </TableRow>
                   )}

                   {/* Totals Row */}
                   <TableRow className="bg-muted/50 font-medium">
                      <TableCell className="text-xs font-semibold">Total</TableCell>
                     <TableCell></TableCell>
                     <TableCell className="text-xs text-right font-semibold">
                       {formatCurrency(lineItems.reduce((s, l) => s + l.amount, 0))}
                     </TableCell>
                     <TableCell className="text-xs text-right font-semibold">
                       {formatCurrency(purchaseOrder.total_billed)}
                     </TableCell>
                     {hasPending && (
                       <TableCell className="text-xs text-right font-semibold">
                         {formatCurrency(totalPending)}
                       </TableCell>
                     )}
                      <TableCell className={cn("text-xs text-right font-semibold",
                        hasPending
                          ? projectedOverBudget && "text-destructive"
                          : (isOverBudget ? "text-destructive" : isWarning ? "text-amber-700" : isHealthy ? "text-green-700" : "")
                      )}>
                       {formatCurrency(hasPending ? projectedRemaining : purchaseOrder.remaining)}
                     </TableCell>
                   </TableRow>
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6 border rounded-lg bg-muted/30">
              No line items found for this purchase order.
            </p>
          )}
        </div>

        {(isOverBudget || (hasPending && projectedOverBudget)) && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            <span className="text-sm text-destructive">
              {hasPending && projectedOverBudget && !isOverBudget
                ? `This bill will put the PO over budget by ${formatCurrency(Math.abs(projectedRemaining))}`
                : `This PO is over budget by ${formatCurrency(Math.abs(hasPending ? projectedRemaining : purchaseOrder.remaining))}`
              }
            </span>
          </div>
        )}

        {currentBillAmount !== undefined && (
          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            <span className="text-muted-foreground">Current Bill: </span>
            <span className="font-medium">{currentBillReference || 'No Reference'}</span>
            <span className="text-muted-foreground"> for </span>
            <span className="font-medium">{formatCurrency(currentBillAmount)}</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
