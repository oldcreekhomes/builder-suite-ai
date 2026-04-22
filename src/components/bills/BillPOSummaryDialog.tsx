import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { POMatch } from "@/hooks/useBillPOMatching";
import { PODetailsDialog, PendingBillLine } from "./PODetailsDialog";
import { useVendorPurchaseOrders } from "@/hooks/useVendorPurchaseOrders";
import { cn } from "@/lib/utils";
import { SettingsTableWrapper } from "@/components/ui/settings-table-wrapper";
import { FilesCell } from "@/components/purchaseOrders/components/FilesCell";

interface BillLine {
  cost_code_id?: string | null;
  cost_code_display?: string;
  amount?: number;
  purchase_order_id?: string | null;
  purchase_order_line_id?: string | null;
  po_reference?: string | null;
  po_assignment?: string | null;
  memo?: string | null;
}

/** Normalize a PO reference for fuzzy comparison. */
function normalizePoRef(s: string | null | undefined): string {
  if (!s) return '';
  return String(s).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

interface BillPOSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matches: POMatch[];
  bill: {
    id?: string;
    project_id?: string | null;
    vendor_id?: string;
    total_amount?: number;
    reference_number?: string | null;
    bill_date?: string;
    status?: string;
    bill_lines?: BillLine[];
  } | null;
}

export function BillPOSummaryDialog({
  open,
  onOpenChange,
  matches,
  bill,
}: BillPOSummaryDialogProps) {
  const matchedPoIdsArr = matches.map(m => m.po_id);
  const { data: vendorPOs, isLoading: isLoadingPOs } = useVendorPurchaseOrders(
    bill?.project_id,
    bill?.vendor_id,
    bill?.id,
    bill?.bill_date,
    matchedPoIdsArr
  );

  // Wait until every requested matched PO is present in vendorPOs to avoid
  // a brief flash of wrong allocations during the secondary fetch.
  const loadedPoIds = new Set((vendorPOs || []).map((p: any) => p.id));
  const allMatchesLoaded = matchedPoIdsArr.every(id => loadedPoIds.has(id));
  const poDataReady = !isLoadingPOs && allMatchesLoaded;



  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Math.round(amount * 100) === 0 ? 0 : amount);

  // Build a lookup of PO line -> PO id from vendorPOs so we can resolve lines linked by purchase_order_line_id
  const poLineToPoId = new Map<string, string>();
  (vendorPOs || []).forEach((po: any) => {
    (po.lines || po.purchase_order_lines || po.line_items || []).forEach((pl: any) => {
      if (pl?.id) poLineToPoId.set(pl.id, po.id);
    });
  });

  // Build a lookup of normalized po_reference -> po_id, restricted to POs in `matches`
  // so an invoice line printing "PO#2025-923T-0027" maps to that exact PO.
  const matchedPoIds = new Set(matches.map(m => m.po_id));
  const refToPoId = new Map<string, string>();
  (vendorPOs || []).forEach((po: any) => {
    if (!matchedPoIds.has(po.id)) return;
    const norm = normalizePoRef(po.po_number);
    if (norm) refToPoId.set(norm, po.id);
  });

  /** Resolve a single bill line to a po_id using the strict allocation order:
   * 0) explicit "No PO" intent — never resolve, never fall back
   * 1) purchase_order_line_id (resolved to its PO)
   * 2) explicit purchase_order_id
   * 3) printed po_reference matched against PO number
   * 4) unique cost_code fallback (only if no other matched PO shares that cost code)
   */
  const resolveLineToPoId = (line: BillLine): string | null => {
    // Hard short-circuit: user explicitly chose "No purchase order" for this line.
    if (line.po_assignment === 'none' || line.purchase_order_id === '__none__') {
      return null;
    }
    if (line.purchase_order_line_id) {
      const poId = poLineToPoId.get(line.purchase_order_line_id);
      if (poId) return poId;
    }
    if (line.purchase_order_id && line.purchase_order_id !== '__auto__' && line.purchase_order_id !== '__none__') {
      return line.purchase_order_id;
    }
    if (line.po_reference) {
      const target = normalizePoRef(line.po_reference);
      if (target) {
        // Exact-or-contains match against any matched PO
        for (const [norm, poId] of refToPoId.entries()) {
          if (norm === target || norm.includes(target) || target.includes(norm)) {
            return poId;
          }
        }
      }
    }
    if (line.cost_code_id) {
      const sameCC = matches.filter(m => m.cost_code_id === line.cost_code_id);
      if (sameCC.length === 1) return sameCC[0].po_id;
    }
    return null;
  };

  // Compute "this bill" amount per PO using resolveLineToPoId
  const getThisBillAmount = (match: POMatch) => {
    if (!bill?.bill_lines) return 0;
    return bill.bill_lines
      .filter(line => resolveLineToPoId(line) === match.po_id)
      .reduce((sum, line) => sum + (line.amount || 0), 0);
  };

  const derivedPendingBillLines = (bill?.bill_lines || []).map(l => {
    const poId = l.purchase_order_id || undefined;
    return {
      cost_code_id: l.cost_code_id || undefined,
      cost_code_display: l.cost_code_display || undefined,
      amount: l.amount || 0,
      purchase_order_line_id: l.purchase_order_line_id || undefined,
      purchase_order_id: poId,
      po_reference: l.po_reference || undefined,
      po_assignment: l.po_assignment || undefined,
      memo: l.memo || undefined,
    };
  });

  // Only use the single-PO direct detail view when EVERY line truly resolves to that one PO.
  // If any line is unmatched / "No PO", fall through to the summary table so the user can
  // see the same lines they see in the editor (matching + unmatched together).
  const billLinesForShortcut = bill?.bill_lines || [];
  const allLinesResolveToSinglePO =
    matches.length === 1 &&
    billLinesForShortcut.length > 0 &&
    billLinesForShortcut.every(l => resolveLineToPoId(l) === matches[0].po_id);

  if (allLinesResolveToSinglePO && open) {
    if (!poDataReady) {
      return (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Loading…</DialogTitle>
              <DialogDescription>Loading purchase order details…</DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );
    }
    const singlePO = vendorPOs?.find(po => po.id === matches[0].po_id) || null;
    return (
      <PODetailsDialog
        open={open}
        onOpenChange={onOpenChange}
        purchaseOrder={singlePO}
        projectId={bill?.project_id || null}
        vendorId={bill?.vendor_id || null}
        currentBillId={bill?.id}
        currentBillAmount={bill?.total_amount}
        currentBillReference={bill?.reference_number || undefined}
        currentBillStatus={bill?.status}
        pendingBillLines={derivedPendingBillLines.filter(l => resolveLineToPoId(l as BillLine) === matches[0].po_id)}
      />
    );
  }

  // Lookup match by po_id for quick row data access
  const matchByPoId = new Map(matches.map(m => [m.po_id, m]));
  const billLines = bill?.bill_lines || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>PO Status Summary</DialogTitle>
            <DialogDescription>
              {bill?.reference_number
                ? `Bill ${bill.reference_number} — ${billLines.length} line items across ${matches.length} POs`
                : `${billLines.length} line items across ${matches.length} POs`}
            </DialogDescription>
          </DialogHeader>

          {!poDataReady ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Loading purchase order details…
            </div>
          ) : (
          <SettingsTableWrapper>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">PO Number</TableHead>
                  <TableHead className="whitespace-nowrap">Cost Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="whitespace-nowrap">PO Amount</TableHead>
                  <TableHead className="whitespace-nowrap">Billed to Date</TableHead>
                  <TableHead className="whitespace-nowrap">This Bill</TableHead>
                  <TableHead className="whitespace-nowrap">Remaining</TableHead>
                  <TableHead className="whitespace-nowrap">Files</TableHead>
                  <TableHead className="whitespace-nowrap">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billLines.map((line, idx) => {
                  const resolvedPoId = resolveLineToPoId(line);
                  const match = resolvedPoId ? matchByPoId.get(resolvedPoId) : undefined;
                  const lineAmount = line.amount || 0;

                  if (!match) {
                    return (
                      <TableRow key={`line-${idx}`}>
                        <TableCell className="whitespace-nowrap font-medium">—</TableCell>
                        <TableCell className="whitespace-nowrap">{line.cost_code_display || '—'}</TableCell>
                        <TableCell>{line.memo || '—'}</TableCell>
                        <TableCell className="whitespace-nowrap">—</TableCell>
                        <TableCell className="whitespace-nowrap">—</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-700">
                            {formatCurrency(lineAmount)}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">—</TableCell>
                        <TableCell className="whitespace-nowrap">—</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
                            No PO
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  }

                  // PO-level totals (same for every line allocated to this PO)
                  const thisBillPoTotal = getThisBillAmount(match);
                  const adjustedRemaining = match.po_amount - match.total_billed - thisBillPoTotal;
                  const projectedBilledCents = Math.round((match.total_billed + thisBillPoTotal) * 100);
                  const poAmountCents = Math.round(match.po_amount * 100);
                  const remainingCents = poAmountCents - projectedBilledCents;
                  const rowStatus: 'matched' | 'over_po' | 'draw' =
                    remainingCents < 0
                      ? 'over_po'
                      : (thisBillPoTotal > 0 && thisBillPoTotal < match.po_amount && match.po_amount > 0 && remainingCents > 0)
                        ? 'draw'
                        : 'matched';
                  const statusLabel = rowStatus === 'matched' ? 'Matched' : rowStatus === 'draw' ? 'Draw' : 'Over';
                  const statusClass = rowStatus === 'over_po' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700';
                  const poRecord = vendorPOs?.find(p => p.id === match.po_id);

                  return (
                    <TableRow key={`line-${idx}`}>
                      <TableCell className="whitespace-nowrap font-medium">{match.po_number}</TableCell>
                      {/* Prefer the bill line's saved cost_code_display so PO summary mirrors the editor */}
                      <TableCell className="whitespace-nowrap">{line.cost_code_display || match.cost_code_display}</TableCell>
                      <TableCell>{line.memo || '—'}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatCurrency(match.po_amount)}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatCurrency(match.total_billed)}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-700">
                          {formatCurrency(lineAmount)}
                        </span>
                      </TableCell>
                      <TableCell
                        className={cn(
                          "whitespace-nowrap font-medium",
                          adjustedRemaining >= 0 ? "text-green-600" : "text-red-600"
                        )}
                      >
                        {formatCurrency(adjustedRemaining)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <FilesCell
                          files={poRecord?.files}
                          projectId={poRecord?.project_id || bill?.project_id || ''}
                        />
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                            statusClass
                          )}
                        >
                          {statusLabel}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={5} className="text-right font-semibold">Total</TableCell>
                  <TableCell className="whitespace-nowrap font-semibold">
                    {formatCurrency(billLines.reduce((sum, l) => sum + (l.amount || 0), 0))}
                  </TableCell>
                  <TableCell colSpan={3}></TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </SettingsTableWrapper>
          )}
      </DialogContent>
    </Dialog>
  );
}
