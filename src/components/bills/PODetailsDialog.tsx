import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { VendorPurchaseOrder, BilledInvoice } from "@/hooks/useVendorPurchaseOrders";
import { FileText, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { formatDateSafe } from "@/utils/dateOnly";
import { POStatusBadge, POStatus } from "./POStatusBadge";

export interface PendingBillLine {
  purchase_order_line_id?: string;
  purchase_order_id?: string;
  po_reference?: string;
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
  currentBillStatus?: string;
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
  currentBillStatus,
  pendingBillLines,
}: PODetailsDialogProps) {
  if (!purchaseOrder) return null;

  // Cent-precise over-budget check to avoid $0.01 floating-point drift.
  // For posted/paid bills, total_billed already includes this bill — don't double-count.
  // For draft bills, total_billed excludes it (the dialog math is forward-looking via pendingBillLines).
  const isDraftBill = (currentBillStatus || 'draft') === 'draft';
  const remainingCents = Math.round(purchaseOrder.remaining * 100);
  const isOverBudget = remainingCents < 0;
  const utilizationPercent = purchaseOrder.total_amount > 0
    ? Math.round((purchaseOrder.total_billed / purchaseOrder.total_amount) * 100)
    : 0;
  const isWarning = utilizationPercent >= 90 && utilizationPercent < 100;
  const isHealthy = !isOverBudget && !isWarning;

  // Determine the bill amount allocated to this PO for the header status badge.
  // For draft: pendingBillLines sum. For posted/paid: currentBillAmount fallback.
  const headerBillAmount = (() => {
    if (pendingBillLines && pendingBillLines.length > 0) {
      return pendingBillLines.reduce((s, l) => s + l.amount, 0);
    }
    return currentBillAmount || 0;
  })();

  const realLineItems = purchaseOrder.line_items || [];

  // Header-only PO fallback: if no line items exist, synthesize one from PO header
  // so the comparison still renders meaningfully instead of "No line items found".
  const headerFallbackDescription = (() => {
    if (pendingBillLines && pendingBillLines.length > 0) {
      const memos = Array.from(new Set(
        pendingBillLines.map(l => (l.memo || '').trim()).filter(m => m.length > 0)
      ));
      if (memos.length > 0) return memos.join(', ');
    }
    return '—';
  })();

  const lineItems = realLineItems.length === 0 && purchaseOrder.total_amount > 0
    ? [{
        id: `__header__${purchaseOrder.id}`,
        line_number: 1,
        description: headerFallbackDescription,
        cost_code_id: purchaseOrder.cost_code_id,
        cost_code: purchaseOrder.cost_code,
        quantity: 1,
        unit_cost: purchaseOrder.total_amount,
        amount: purchaseOrder.total_amount,
        total_billed: purchaseOrder.total_billed,
        remaining: purchaseOrder.remaining,
        billed_invoices: purchaseOrder.unallocated_invoices || [],
      }]
    : realLineItems;

  const isHeaderOnly = realLineItems.length === 0 && lineItems.length === 1;
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

  // Normalize a PO reference for comparison.
  const normPoRef = (s: string | null | undefined) =>
    s ? String(s).toUpperCase().replace(/[^A-Z0-9]/g, '') : '';

  const thisPoId = purchaseOrder.id;
  const thisPoNumberNorm = normPoRef(purchaseOrder.po_number);

  /** True if a pending bill line is explicitly tied to THIS purchase order
   *  (by purchase_order_id or by printed po_reference matching this PO number). */
  const isExplicitlyOnThisPO = (pbl: PendingBillLine): boolean => {
    if (pbl.purchase_order_id && pbl.purchase_order_id === thisPoId) return true;
    if (pbl.po_reference && thisPoNumberNorm) {
      const target = normPoRef(pbl.po_reference);
      if (target && (target === thisPoNumberNorm || thisPoNumberNorm.includes(target) || target.includes(thisPoNumberNorm))) {
        return true;
      }
    }
    return false;
  };

  /** True if a pending bill line is explicitly tied to a DIFFERENT purchase order.
   *  Used to exclude it from cost-code/single-line fallbacks on this PO. */
  const isExplicitlyOnOtherPO = (pbl: PendingBillLine): boolean => {
    if (pbl.purchase_order_id && pbl.purchase_order_id !== thisPoId) return true;
    if (pbl.purchase_order_line_id) {
      const matched = lineItems.find(l => l.id === pbl.purchase_order_line_id);
      // If the line id doesn't belong to any line on THIS PO, treat as other-PO
      if (!matched && !pbl.purchase_order_id) return true;
    }
    if (pbl.po_reference && thisPoNumberNorm) {
      const target = normPoRef(pbl.po_reference);
      if (target && !(target === thisPoNumberNorm || thisPoNumberNorm.includes(target) || target.includes(thisPoNumberNorm))) {
        return true;
      }
    }
    return false;
  };

  // Helper to find pending amount for a PO line
  const getPendingForLine = (lineId: string, lineCostCodeId?: string, lineDescription?: string): number => {
    if (!hasPending) return 0;
    return pendingBillLines.reduce((sum, pbl) => {
      // Tier 1: explicit line match
      if (pbl.purchase_order_line_id === lineId) return sum + pbl.amount;

      // Skip if this pending line already has an explicit line assignment to ANOTHER line
      if (pbl.purchase_order_line_id) return sum;

      // Tier 1.5: explicit PO match (purchase_order_id or po_reference) → distribute by cost code on this PO
      if (isExplicitlyOnThisPO(pbl)) {
        // If only one line on this PO, attribute to it
        if (lineItems.length === 1) return sum + pbl.amount;
        // Prefer matching cost code on this PO
        if (pbl.cost_code_id && pbl.cost_code_id === lineCostCodeId) {
          const sameCCLines = lineItems.filter(l => l.cost_code_id === lineCostCodeId);
          if (sameCCLines.length <= 1) return sum + pbl.amount;
          // Multiple lines share cost code on this PO — disambiguate by memo keywords
          let bestScore = 0;
          let bestLineId: string | null = null;
          for (const candidate of sameCCLines) {
            const score = memoMatchScore(pbl.memo, candidate.description);
            if (score > bestScore) {
              bestScore = score;
              bestLineId = candidate.id;
            }
          }
          if (bestLineId === lineId) return sum + pbl.amount;
        }
        return sum;
      }

      // If the pending line is explicitly tied to a different PO, do not consider it here
      if (isExplicitlyOnOtherPO(pbl)) return sum;

      // Tier 2: exact cost code match (no explicit PO link)
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

      // Tier 3: single-line PO fallback
      if (lineItems.length === 1) {
        return sum + pbl.amount;
      }

      return sum;
    }, 0);
  };

  // Returns the bill-side memos attributed to this PO line, using the SAME
  // tier rules as getPendingForLine so Description and "This Bill" stay in sync.
  const getPendingMemosForLine = (lineId: string, lineCostCodeId?: string, lineDescription?: string): string[] => {
    if (!hasPending) return [];
    const memos: string[] = [];
    const push = (pbl: PendingBillLine) => {
      const m = (pbl.memo || '').trim();
      if (m) memos.push(m);
    };
    for (const pbl of pendingBillLines) {
      // Tier 1: explicit line match
      if (pbl.purchase_order_line_id === lineId) { push(pbl); continue; }

      // Skip if this pending line already has an explicit line assignment to ANOTHER line
      if (pbl.purchase_order_line_id) continue;

      // Tier 1.5: explicit PO match → distribute by cost code on this PO
      if (isExplicitlyOnThisPO(pbl)) {
        if (lineItems.length === 1) { push(pbl); continue; }
        if (pbl.cost_code_id && pbl.cost_code_id === lineCostCodeId) {
          const sameCCLines = lineItems.filter(l => l.cost_code_id === lineCostCodeId);
          if (sameCCLines.length <= 1) { push(pbl); continue; }
          let bestScore = 0;
          let bestLineId: string | null = null;
          for (const candidate of sameCCLines) {
            const score = memoMatchScore(pbl.memo, candidate.description);
            if (score > bestScore) {
              bestScore = score;
              bestLineId = candidate.id;
            }
          }
          if (bestLineId === lineId) push(pbl);
        }
        continue;
      }

      if (isExplicitlyOnOtherPO(pbl)) continue;

      // Tier 2: exact cost code match
      if (pbl.cost_code_id && pbl.cost_code_id === lineCostCodeId) {
        const sameCCLines = lineItems.filter(l => l.cost_code_id === lineCostCodeId);
        if (sameCCLines.length <= 1) { push(pbl); continue; }
        let bestScore = 0;
        let bestLineId: string | null = null;
        for (const candidate of sameCCLines) {
          const score = memoMatchScore(pbl.memo, candidate.description);
          if (score > bestScore) {
            bestScore = score;
            bestLineId = candidate.id;
          }
        }
        if (bestScore >= 1 && bestLineId === lineId) push(pbl);
        continue;
      }

      // Tier 3: single-line PO fallback
      if (lineItems.length === 1) push(pbl);
    }
    // De-dupe while preserving order
    return Array.from(new Set(memos));
  };


  const totalPending = hasPending ? pendingBillLines.reduce((s, l) => s + l.amount, 0) : 0;
  const projectedRemaining = Math.round((purchaseOrder.remaining - totalPending) * 100) / 100;
  const projectedOverBudget = projectedRemaining < 0;

  // Compute header status using the same cent-precise logic as useBillPOMatching.
  // For draft: project forward by adding pendingBillLines (or currentBillAmount fallback).
  // For posted/paid: total_billed already includes this bill, use as-is.
  const headerStatus: POStatus = (() => {
    const poAmount = purchaseOrder.total_amount || 0;
    const projectedBilled = isDraftBill
      ? purchaseOrder.total_billed + headerBillAmount
      : purchaseOrder.total_billed;
    const headerRemainingCents = Math.round((poAmount - projectedBilled) * 100);
    if (headerRemainingCents < 0) return 'over_po';
    // Draw: this bill is a partial slice of the PO total
    if (headerRemainingCents >= 0 && headerBillAmount > 0 && headerBillAmount < poAmount && poAmount > 0) {
      return 'draw';
    }
    return 'matched';
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <span>PO {purchaseOrder.po_number}</span>
            </DialogTitle>
            <div className="ml-auto">
              <POStatusBadge status={headerStatus} />
            </div>
          </div>
        </DialogHeader>

        {/* Line Items Table */}
        <div className="flex-1 overflow-y-auto">
          {lineItems.length > 0 ? (
            <TooltipProvider delayDuration={200}>
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

                      // Description = bill memo(s) attributed to this PO line, falling
                      // back to the PO line's own description, then '—'. Matches what
                      // the user sees in the bills table and the Edit Bill dialog.
                      const billMemos = getPendingMemosForLine(line.id, line.cost_code_id, line.description);
                      const descriptionText = billMemos.length > 0
                        ? billMemos.join(', ')
                        : (line.description || '—');
                      const costCodeText = line.cost_code
                        ? `${line.cost_code.code}: ${line.cost_code.name}`
                        : '—';

                      return (
                        <TableRow key={line.id}>
                         <TableCell>
                           <Tooltip>
                             <TooltipTrigger asChild>
                               <span className="block truncate max-w-[200px]">{costCodeText}</span>
                             </TooltipTrigger>
                             <TooltipContent className="max-w-md break-words">
                               {costCodeText}
                             </TooltipContent>
                           </Tooltip>
                         </TableCell>
                         <TableCell>
                           <Tooltip>
                             <TooltipTrigger asChild>
                               <span className="block truncate max-w-[260px]">{descriptionText}</span>
                             </TooltipTrigger>
                             <TooltipContent className="max-w-md">
                               <p className="whitespace-pre-wrap break-words">{descriptionText}</p>
                             </TooltipContent>
                           </Tooltip>
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
            </TooltipProvider>
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
