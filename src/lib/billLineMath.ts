// Single source of truth for bill line totals + grouping.
// Used by both EditBillDialog (Rejected, Approved, Paid)
// and EditExtractedBillDialog (Enter with AI, Review).

export interface NormalizedLine {
  id: string;
  // grouping identity
  costCodeKey: string;        // cost_code_id or account_id
  memo: string;
  purchaseOrderId: string;
  purchaseOrderLineId: string;
  // numeric facts
  quantity: number;
  unitCost: number;
  // optional metadata
  lotId?: string;
}

export interface DisplayGroup<TChild = unknown> {
  key: string;
  children: TChild[];
  isGrouped: boolean;
  quantity: number;     // SUM of child quantities (raw, unrounded)
  unitCost: number;     // shared rate
  amount: number;       // displayed total = round(quantity * unitCost, 2)
  lotCost: number;      // amount / lotCount
  lotIds: string[];
}

// Round to cents.
export function roundCents(n: number): number {
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
}

// The single canonical row total formula. Used for both per-row display
// AND footer totals so they always agree.
export function rowTotal(quantity: number, unitCost: number): number {
  const q = Number.isFinite(quantity) ? quantity : 0;
  const u = Number.isFinite(unitCost) ? unitCost : 0;
  return roundCents(q * u);
}

// Group an array of lines by (costCode + unitCost + memo + PO).
// Each child is preserved so the caller can map it back to its underlying row.
export function groupBillLines<T>(
  items: T[],
  pick: (item: T) => NormalizedLine,
): DisplayGroup<T>[] {
  const buckets = new Map<string, T[]>();
  const order: string[] = [];

  for (const item of items) {
    const n = pick(item);
    const key = [
      n.costCodeKey,
      n.unitCost.toFixed(6),
      n.memo.trim(),
      n.purchaseOrderId,
      n.purchaseOrderLineId,
    ].join('|');
    if (!buckets.has(key)) {
      buckets.set(key, []);
      order.push(key);
    }
    buckets.get(key)!.push(item);
  }

  return order.map((key) => {
    const children = buckets.get(key)!;
    const firstN = pick(children[0]);
    const totalQty = children.reduce((s, c) => s + (pick(c).quantity || 0), 0);
    // Display the clean 2dp quantity (matches what user typed on the invoice).
    const cleanQty = Math.round(totalQty * 100) / 100;
    // Displayed group total = quantity * unitCost (matches each row visually).
    const amount = rowTotal(cleanQty, firstN.unitCost);
    const lotIds = children
      .map((c) => pick(c).lotId)
      .filter((x): x is string => Boolean(x));
    const lotCount = Math.max(lotIds.length, children.length, 1);
    return {
      key,
      children,
      isGrouped: children.length > 1,
      quantity: cleanQty,
      unitCost: firstN.unitCost,
      amount,
      lotCost: amount / lotCount,
      lotIds,
    };
  });
}

// Footer total = sum of displayed group amounts (so footer ALWAYS equals
// what the user sees in the rows above).
export function sumDisplayedTotal<T>(groups: DisplayGroup<T>[]): number {
  return roundCents(groups.reduce((s, g) => s + g.amount, 0));
}
