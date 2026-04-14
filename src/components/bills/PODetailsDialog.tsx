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
  memo?: string;
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
  }).format(Math.round(amount * 100) === 0 ? 0 : amount);

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
            "",
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

  // Keyword matching helpers (mirrors useVendorPurchaseOrders.ts logic)
  const normToken = (t: string) => {
    const low = t.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!low) return '';
    if (low.endsWith('s') && low.length > 3 && !low.endsWith('ss')) return low.slice(0, -1);
    return low;
  };
  const tokenize = (text: string | null | undefined) =>
    (text || '').split(/\s+/).map(normToken).filter(t => t.length > 1);

  const memoMatchScore = (memo: string | null | undefined, description: string | null | undefined): number => {
    const memoTokens = tokenize(memo);
    const descTokens = tokenize(description);
    if (memoTokens.length === 0 || descTokens.length === 0) return 0;
    let hits = 0;
    for (const dt of descTokens) {
      if (memoTokens.some(mt => mt === dt || mt.includes(dt) || dt.includes(mt))) hits++;
    }
    return hits;
  };

  // Helper to find pending amount for a PO line
  // Build a set of cost_code_ids that are already explicitly matched by any pending bill line
  const explicitlyMatchedCostCodes = new Set<string>();
  if (hasPending) {
    for (const pbl of pendingBillLines) {
      if (pbl.purchase_order_line_id) {
        const matchedLine = lineItems.find(l => l.id === pbl.purchase_order_line_id);
        if (matchedLine?.cost_code_id) explicitlyMatchedCostCodes.add(matchedLine.cost_code_id);
      }
    }
  }

  // Helper to find pending amount for a PO line
  const getPendingForLine = (lineId: string, lineCostCodeId?: string, lineDescription?: string): number => {
    if (!hasPending) return 0;
    return pendingBillLines.reduce((sum, pbl) => {
      // Tier 1: explicit line match
      if (pbl.purchase_order_line_id === lineId) return sum + pbl.amount;

      // Skip remaining tiers if this pending line already has an explicit line assignment
      if (pbl.purchase_order_line_id) return sum;

      // Tier 2: exact cost code match
      if (pbl.cost_code_id && pbl.cost_code_id === lineCostCodeId) {
        const sameCCLines = lineItems.filter(l => l.cost_code_id === lineCostCodeId);
        if (sameCCLines.length <= 1) {
          return sum + pbl.amount;
        }
        // Multiple lines share cost code — use memo keyword matching
        let bestScore = 0;
        let bestLineId: string | null = null;
        for (const candidate of sameCCLines) {
          const score = memoMatchScore(pbl.memo, candidate.description);
          if (score > bestScore) {
            bestScore = score;
            bestLineId = candidate.id;
          }
        }
        if (bestScore >= 1 && bestLineId === lineId) {
          return sum + pbl.amount;
        }
        return sum;
      }

      // Tier 2.5: parent/child cost code match (placeholder for future enhancement)
      // Would compare bill line's cost code string against PO line's cost code string
      // e.g., bill "3180.2" starts with PO "3180" — requires cost code strings on pending lines

      // Tier 3: single-line PO fallback
      // If this PO has only one line item and the bill line wasn't matched by any tier above,
      // attribute it to the single line (safe because bill was already filtered to this PO)
      if (lineItems.length === 1) {
        return sum + pbl.amount;
      }

      return sum;
    }, 0);
  };

  const totalPending = hasPending ? pendingBillLines.reduce((s, l) => s + l.amount, 0) : 0;
  const projectedRemaining = Math.round((purchaseOrder.remaining - totalPending) * 100) / 100;
  const projectedOverBudget = projectedRemaining < 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <span>PO {purchaseOrder.po_number}</span>
            <div className="ml-auto">
            {(isOverBudget || (hasPending && projectedOverBudget)) ? (
                <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Over Budget</Badge>
              ) : isWarning ? (
                <Badge variant="secondary" className="bg-amber-100 text-amber-700 gap-1"><AlertTriangle className="h-3 w-3" />Near Limit</Badge>
              ) : (
                <Badge variant="secondary" className="bg-green-100 text-green-700 gap-1"><Check className="h-3 w-3" />Matched</Badge>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Line Items Table */}
        <div className="flex-1 overflow-y-auto">
          {lineItems.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <Table containerClassName="relative w-full">
                <TableHeader>
                  <TableRow>
                     <TableHead>Cost Code</TableHead>
                     <TableHead>Description</TableHead>
                     <TableHead>PO Amount</TableHead>
                     <TableHead>Billed To Date</TableHead>
                     {hasPending && <TableHead>This Bill</TableHead>}
                     <TableHead>Remaining</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {lineItems.map((line) => {
                      const linePending = getPendingForLine(line.id, line.cost_code_id, line.description);
                      const lineProjectedRemaining = Math.round((line.remaining - linePending) * 100) / 100;
                      const lineOver = hasPending ? lineProjectedRemaining < 0 : line.remaining < 0;
                      const lineComplete = hasPending
                        ? (line.total_billed + linePending >= line.amount && line.amount > 0)
                        : (line.total_billed >= line.amount && line.amount > 0);
                      const linePartial = hasPending
                        ? ((line.total_billed + linePending > 0) && (line.total_billed + linePending < line.amount))
                        : (line.total_billed > 0 && line.total_billed < line.amount);

                      return (
                        <TableRow key={line.id}>
                         <TableCell>
                            {line.cost_code ? `${line.cost_code.code}: ${line.cost_code.name}` : '—'}
                         </TableCell>
                         <TableCell>
                           {line.description || '—'}
                         </TableCell>
                         <TableCell>
                           {formatCurrency(line.amount)}
                         </TableCell>
                         <TableCell>
                           <BilledAmountWithTooltip amount={line.total_billed} invoices={line.billed_invoices} currentBillId={currentBillId} />
                         </TableCell>
                          {hasPending && (
                            <TableCell>
                               {linePending > 0 ? (
                                  <span className="bg-green-100 text-green-700 px-1 rounded font-medium">
                                    {formatCurrency(linePending)}
                                 </span>
                               ) : '—'}
                            </TableCell>
                          )}
                         <TableCell className={cn("font-medium",
                             hasPending
                               ? (lineProjectedRemaining < 0 ? "text-destructive" : lineProjectedRemaining >= 0 ? "text-green-700" : "")
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
                       <TableCell className="italic text-muted-foreground">Unallocated</TableCell>
                       <TableCell></TableCell>
                       <TableCell></TableCell>
                       <TableCell className="text-amber-700 font-medium">
                         <BilledAmountWithTooltip amount={purchaseOrder.unallocated_billed} invoices={purchaseOrder.unallocated_invoices} />
                       </TableCell>
                       {hasPending && <TableCell></TableCell>}
                       <TableCell></TableCell>
                     </TableRow>
                   )}

                   {/* Totals Row */}
                   <TableRow className="bg-muted/50 font-medium">
                      <TableCell className="font-semibold">Total</TableCell>
                      <TableCell></TableCell>
                       <TableCell className="font-semibold">
                         {formatCurrency(lineItems.reduce((s, l) => s + l.amount, 0))}
                       </TableCell>
                       <TableCell className="font-semibold">
                         {formatCurrency(purchaseOrder.total_billed)}
                       </TableCell>
                       {hasPending && (
                          <TableCell className="font-semibold text-green-700">
                            {formatCurrency(totalPending)}
                          </TableCell>
                       )}
                        <TableCell className={cn("font-semibold",
                         hasPending
                           ? (projectedRemaining < 0 ? "text-destructive" : projectedRemaining >= 0 ? "text-green-700" : "")
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

      </DialogContent>
    </Dialog>
  );
}
