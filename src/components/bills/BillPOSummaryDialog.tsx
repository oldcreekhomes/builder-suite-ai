import { useState } from "react";
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
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { POMatch } from "@/hooks/useBillPOMatching";
import { PODetailsDialog, PendingBillLine } from "./PODetailsDialog";
import { useVendorPurchaseOrders } from "@/hooks/useVendorPurchaseOrders";
import { cn } from "@/lib/utils";
import { SettingsTableWrapper } from "@/components/ui/settings-table-wrapper";

interface BillLine {
  cost_code_id?: string | null;
  amount?: number;
  purchase_order_id?: string | null;
  purchase_order_line_id?: string | null;
  po_reference?: string | null;
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
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null);

  const { data: vendorPOs } = useVendorPurchaseOrders(
    bill?.project_id,
    bill?.vendor_id,
    bill?.id,
    bill?.bill_date
  );

  const selectedPO = vendorPOs?.find(po => po.id === selectedPoId) || null;

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
   * 1) purchase_order_line_id (resolved to its PO)
   * 2) explicit purchase_order_id
   * 3) printed po_reference matched against PO number
   * 4) unique cost_code fallback (only if no other matched PO shares that cost code)
   */
  const resolveLineToPoId = (line: BillLine): string | null => {
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
      amount: l.amount || 0,
      purchase_order_line_id: l.purchase_order_line_id || undefined,
      purchase_order_id: poId,
      po_reference: l.po_reference || undefined,
      memo: l.memo || undefined,
    };
  });

  // If only one match, go directly to the detail dialog
  if (matches.length === 1 && open) {
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

  return (
    <>
      <Dialog open={open && !selectedPoId} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>PO Status Summary</DialogTitle>
            <DialogDescription>
              {bill?.reference_number
                ? `Bill ${bill.reference_number} — ${matches.length} matched POs`
                : `${matches.length} matched POs`}
            </DialogDescription>
          </DialogHeader>

          <SettingsTableWrapper>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">PO Number</TableHead>
                  <TableHead className="whitespace-nowrap">Cost Code</TableHead>
                  <TableHead className="whitespace-nowrap text-right">PO Amount</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Billed to Date</TableHead>
                  <TableHead className="whitespace-nowrap text-right">This Bill</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Remaining</TableHead>
                  <TableHead className="whitespace-nowrap text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...matches].sort((a, b) => (a.po_number || '').localeCompare(b.po_number || '')).map((match) => {
                  const thisBillAmount = getThisBillAmount(match);
                  const adjustedRemaining = match.po_amount - match.total_billed - thisBillAmount;
                  return (
                  <TableRow
                    key={match.po_id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedPoId(match.po_id)}
                  >
                    <TableCell className="whitespace-nowrap font-medium">{match.po_number}</TableCell>
                    <TableCell className="whitespace-nowrap">{match.cost_code_display}</TableCell>
                    <TableCell className="whitespace-nowrap text-right">{formatCurrency(match.po_amount)}</TableCell>
                    <TableCell className="whitespace-nowrap text-right">{formatCurrency(match.total_billed)}</TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-700">
                        {formatCurrency(thisBillAmount)}
                      </span>
                    </TableCell>
                    <TableCell
                      className={cn(
                        "whitespace-nowrap text-right font-medium",
                        adjustedRemaining >= 0 ? "text-green-600" : "text-red-600"
                      )}
                    >
                      {formatCurrency(adjustedRemaining)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-center">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          match.status === "matched"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        )}
                      >
                        {match.status === "matched" ? "Matched" : "Over"}
                      </span>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </SettingsTableWrapper>
        </DialogContent>
      </Dialog>

      {/* Drill-down into single PO detail */}
      <PODetailsDialog
        open={!!selectedPoId}
        onOpenChange={(isOpen) => {
          if (!isOpen) setSelectedPoId(null);
        }}
        purchaseOrder={selectedPO}
        projectId={bill?.project_id || null}
        vendorId={bill?.vendor_id || null}
        currentBillId={bill?.id}
        currentBillAmount={bill?.total_amount}
        currentBillReference={bill?.reference_number || undefined}
        currentBillStatus={bill?.status}
        pendingBillLines={derivedPendingBillLines.filter(l => {
          if (l.purchase_order_line_id) {
            const poId = poLineToPoId.get(l.purchase_order_line_id);
            if (poId) return poId === selectedPoId;
          }
          return l.purchase_order_id === selectedPoId;
        })}
      />
    </>
  );
}
