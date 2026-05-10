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
import { useVendorPurchaseOrders } from "@/hooks/useVendorPurchaseOrders";
import { cn } from "@/lib/utils";
import { SettingsTableWrapper } from "@/components/ui/settings-table-wrapper";
import { FilesCell } from "@/components/purchaseOrders/components/FilesCell";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const TruncatedCell = ({ value, className }: { value: string; className?: string }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <span className={cn("block truncate", className)}>{value}</span>
    </TooltipTrigger>
    <TooltipContent>{value}</TooltipContent>
  </Tooltip>
);

interface BillLine {
  cost_code_id?: string | null;
  cost_code_display?: string;
  cost_codes?: { code?: string | null; name?: string | null } | null;
  amount?: number;
  purchase_order_id?: string | null;
  purchase_order_line_id?: string | null;
  po_reference?: string | null;
  po_assignment?: string | null;
  memo?: string | null;
  lot_id?: string | null;
  project_lots?: { lot_name?: string | null; lot_number?: number | string | null } | null;
}

interface GroupedLine {
  representative: BillLine;
  totalAmount: number;
  lots: { name: string; amount: number }[];
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

  // Precomputed map: each bill line (by reference) → resolved po_id or null.
  // Resolution order:
  //   0) explicit "No PO" intent
  //   1) purchase_order_line_id
  //   2) explicit purchase_order_id
  //   3) printed po_reference matching a PO
  //   4) cost-code fallback — fit-aware: only attaches if line fits in remaining
  //      capacity (decremented as siblings consume the same PO). Lone-line on a
  //      cost code attaches even if it overflows so user sees Over.
  const billLinesAll = bill?.bill_lines || [];
  const ccLineCount = new Map<string, number>();
  billLinesAll.forEach(l => {
    if (l.cost_code_id) ccLineCount.set(l.cost_code_id, (ccLineCount.get(l.cost_code_id) || 0) + 1);
  });
  const lineToPoId = new Map<BillLine, string | null>();
  const attributedThisBill = new Map<string, number>();
  billLinesAll.forEach(line => {
    if (line.po_assignment === 'none' || line.purchase_order_id === '__none__') {
      lineToPoId.set(line, null);
      return;
    }
    let poId: string | null = null;
    if (line.purchase_order_line_id) {
      poId = poLineToPoId.get(line.purchase_order_line_id) || null;
    }
    if (!poId && line.purchase_order_id && line.purchase_order_id !== '__auto__' && line.purchase_order_id !== '__none__') {
      poId = line.purchase_order_id;
    }
    if (!poId && line.po_reference) {
      const target = normalizePoRef(line.po_reference);
      if (target) {
        for (const [norm, pid] of refToPoId.entries()) {
          if (norm === target || norm.includes(target) || target.includes(norm)) { poId = pid; break; }
        }
      }
    }
    if (!poId && line.cost_code_id) {
      const candidates = matches.filter(m => m.cost_code_id === line.cost_code_id);
      if (candidates.length > 0) {
        const lineAmount = line.amount || 0;
        const isLone = (ccLineCount.get(line.cost_code_id) || 0) <= 1;
        const fitter = candidates.find(c => {
          const used = attributedThisBill.get(c.po_id) || 0;
          return (c.po_amount - c.total_billed - used) >= lineAmount;
        });
        if (fitter) {
          poId = fitter.po_id;
        } else if (isLone) {
          let best = candidates[0];
          for (let i = 1; i < candidates.length; i++) {
            if (candidates[i].po_amount > best.po_amount) best = candidates[i];
          }
          poId = best.po_id;
        }
      }
    }
    if (poId) {
      attributedThisBill.set(poId, (attributedThisBill.get(poId) || 0) + (line.amount || 0));
    }
    lineToPoId.set(line, poId);
  });

  const resolveLineToPoId = (line: BillLine): string | null => lineToPoId.get(line) ?? null;

  // Compute "this bill" amount per PO using the precomputed map.
  const getThisBillAmount = (match: POMatch) => attributedThisBill.get(match.po_id) || 0;

  // Lookup match by po_id for quick row data access
  const matchByPoId = new Map(matches.map(m => [m.po_id, m]));
  const billLines = bill?.bill_lines || [];

  // Resolve the cost code display string for a line, falling back to the matched PO's cost code.
  const getLineCostCodeDisplay = (line: BillLine): string => {
    if (line.cost_code_display) return line.cost_code_display;
    const cc = line.cost_codes;
    if (cc && (cc.code || cc.name)) {
      if (cc.code && cc.name) return `${cc.code}: ${cc.name}`;
      return (cc.code || cc.name) as string;
    }
    const poId = resolveLineToPoId(line);
    if (poId) {
      const m = matchByPoId.get(poId);
      if (m?.cost_code_display) return m.cost_code_display;
    }
    return '';
  };

  // Group bill_lines by PO line identity (resolvedPoId, purchase_order_line_id ?? cost_code_id, memo)
  // so multiple lots for the same PO line collapse into a single row.
  const naturalLotKey = (name: string) => {
    const m = name.match(/(\d+)/);
    return m ? parseInt(m[1], 10) : Number.MAX_SAFE_INTEGER;
  };
  const lotNameOf = (line: BillLine): string | null => {
    if (!line.lot_id || !line.project_lots) return null;
    return line.project_lots.lot_name || (line.project_lots.lot_number != null ? `Lot ${line.project_lots.lot_number}` : null);
  };

  const groupMap = new Map<string, GroupedLine>();
  const groupOrder: string[] = [];
  billLines.forEach((line) => {
    const poId = resolveLineToPoId(line) ?? '__none__';
    const lineKey = line.purchase_order_line_id || line.cost_code_id || 'no-cc';
    const memoKey = (line.memo || '').trim();
    const key = `${poId}::${lineKey}::${memoKey}`;
    let g = groupMap.get(key);
    if (!g) {
      g = { representative: line, totalAmount: 0, lots: [] };
      groupMap.set(key, g);
      groupOrder.push(key);
    }
    g.totalAmount = Math.round((g.totalAmount + (line.amount || 0)) * 100) / 100;
    const lotName = lotNameOf(line);
    if (lotName) g.lots.push({ name: lotName, amount: line.amount || 0 });
  });
  // Sort lots within each group naturally
  groupMap.forEach(g => {
    g.lots.sort((a, b) => naturalLotKey(a.name) - naturalLotKey(b.name) || a.name.localeCompare(b.name));
  });

  // Sort groups by leading cost-code number ascending; missing → bottom. Stable.
  const sortedGroups = groupOrder
    .map((key, idx) => ({ key, group: groupMap.get(key)!, idx, sortKey: getLineCostCodeDisplay(groupMap.get(key)!.representative) }))
    .sort((a, b) => {
      const aMatch = a.sortKey.match(/\d+(\.\d+)?/);
      const bMatch = b.sortKey.match(/\d+(\.\d+)?/);
      const aNum = aMatch ? parseFloat(aMatch[0]) : Number.POSITIVE_INFINITY;
      const bNum = bMatch ? parseFloat(bMatch[0]) : Number.POSITIVE_INFINITY;
      if (aNum !== bNum) return aNum - bNum;
      const cmp = a.sortKey.localeCompare(b.sortKey, undefined, { numeric: true });
      return cmp !== 0 ? cmp : a.idx - b.idx;
    });

  const LotsCell = ({ lots, costCode }: { lots: { name: string; amount: number }[]; costCode: string }) => {
    if (lots.length === 0) return <span className="text-muted-foreground">—</span>;
    if (lots.length === 1) return <span>{lots[0].name}</span>;
    const total = lots.reduce((s, l) => s + l.amount, 0);
    const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return (
      <Tooltip>
        <TooltipTrigger>+{lots.length}</TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <div>
              <div className="font-medium text-xs">{costCode}</div>
              <div className="pl-2 space-y-0.5">
                {lots.map((lot, j) => (
                  <div key={j} className="flex justify-between gap-4 text-xs">
                    <span className="text-muted-foreground">{lot.name}:</span>
                    <span>{fmt(lot.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t pt-1 flex justify-between gap-4 font-medium text-xs">
              <span>Total:</span>
              <span>{fmt(total)}</span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] xl:max-w-7xl" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>PO Status Summary</DialogTitle>
            <DialogDescription>
              {(() => {
                const linkedLines = billLines.filter(l => resolveLineToPoId(l) !== null);
                const offPoLines = billLines.length - linkedLines.length;
                const distinctPos = new Set(linkedLines.map(l => resolveLineToPoId(l))).size;
                const linkedCount = linkedLines.length;
                const linePart = `${linkedCount} line item${linkedCount === 1 ? '' : 's'} across ${distinctPos} PO${distinctPos === 1 ? '' : 's'}`;
                const offPart = offPoLines > 0 ? ` · ${offPoLines} off-PO` : '';
                const prefix = bill?.reference_number ? `Bill ${bill.reference_number} — ` : '';
                return `${prefix}${linePart}${offPart}`;
              })()}
            </DialogDescription>
          </DialogHeader>

          {!poDataReady ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Loading purchase order details…
            </div>
          ) : (
          <TooltipProvider delayDuration={150}>
          <SettingsTableWrapper>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">PO Number</TableHead>
                  <TableHead className="whitespace-nowrap">Cost Code</TableHead>
                  <TableHead className="whitespace-nowrap">Description</TableHead>
                  <TableHead className="whitespace-nowrap">Lots</TableHead>
                  <TableHead className="whitespace-nowrap">PO Amount</TableHead>
                  <TableHead className="whitespace-nowrap">Billed to Date</TableHead>
                  <TableHead className="whitespace-nowrap">This Bill</TableHead>
                  <TableHead className="whitespace-nowrap">Remaining</TableHead>
                  <TableHead className="whitespace-nowrap">Files</TableHead>
                  <TableHead className="whitespace-nowrap">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedGroups.map(({ key, group }) => {
                  const line = group.representative;
                  const resolvedPoId = resolveLineToPoId(line);
                  const match = resolvedPoId ? matchByPoId.get(resolvedPoId) : undefined;
                  const lineAmount = group.totalAmount;

                  if (!match) {
                    return (
                      <TableRow key={`grp-${key}`}>
                        <TableCell className="whitespace-nowrap font-medium">—</TableCell>
                        <TableCell className="max-w-[140px]"><TruncatedCell value={getLineCostCodeDisplay(line) || '—'} /></TableCell>
                        <TableCell className="max-w-[220px]"><TruncatedCell value={line.memo || '—'} /></TableCell>
                        <TableCell className="whitespace-nowrap"><LotsCell lots={group.lots} costCode={getLineCostCodeDisplay(line) || '—'} /></TableCell>
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
                    <TableRow key={`grp-${key}`}>
                      <TableCell className="whitespace-nowrap font-medium">{match.po_number}</TableCell>
                      <TableCell className="max-w-[140px]"><TruncatedCell value={getLineCostCodeDisplay(line) || match.cost_code_display || '—'} /></TableCell>
                      <TableCell className="max-w-[220px]"><TruncatedCell value={line.memo || '—'} /></TableCell>
                      <TableCell className="whitespace-nowrap"><LotsCell lots={group.lots} costCode={getLineCostCodeDisplay(line) || match.cost_code_display || '—'} /></TableCell>
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
                  <TableCell colSpan={6} className="text-right font-semibold">Total</TableCell>
                  <TableCell className="whitespace-nowrap font-semibold">
                    {formatCurrency(billLines.reduce((sum, l) => sum + (l.amount || 0), 0))}
                  </TableCell>
                  <TableCell colSpan={4}></TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </SettingsTableWrapper>
          </TooltipProvider>
          )}
      </DialogContent>
    </Dialog>
  );
}
