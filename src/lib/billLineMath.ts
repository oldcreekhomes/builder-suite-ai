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
// Lot-distributed rows (every child has a lotId) are further merged across
// differing unitCosts so a remainder lot (rounded cents) collapses into the
// same display group as the main lots.
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

  // Second pass: merge lot-distributed groups that share
  // (costCode + memo + PO + POLine), regardless of unitCost, so a remainder
  // lot at a different per-lot rate collapses into the main row.
  const lotMergeKey = (n: NormalizedLine) =>
    [n.costCodeKey, n.memo.trim(), n.purchaseOrderId, n.purchaseOrderLineId].join('|');

  const mergedBuckets = new Map<string, T[]>();
  const mergedOrder: string[] = [];
  const used = new Set<string>();

  for (const key of order) {
    if (used.has(key)) continue;
    const children = buckets.get(key)!;
    const allHaveLot = children.every((c) => Boolean(pick(c).lotId));
    if (!allHaveLot) {
      mergedBuckets.set(key, children);
      mergedOrder.push(key);
      used.add(key);
      continue;
    }
    const mk = lotMergeKey(pick(children[0]));
    const merged: T[] = [...children];
    used.add(key);
    for (const otherKey of order) {
      if (used.has(otherKey)) continue;
      const otherChildren = buckets.get(otherKey)!;
      const otherAllLot = otherChildren.every((c) => Boolean(pick(c).lotId));
      if (!otherAllLot) continue;
      if (lotMergeKey(pick(otherChildren[0])) !== mk) continue;
      merged.push(...otherChildren);
      used.add(otherKey);
    }
    mergedBuckets.set(key, merged);
    mergedOrder.push(key);
  }

  return mergedOrder.map((key) => {
    const children = mergedBuckets.get(key)!;
    const lotIds = children
      .map((c) => pick(c).lotId)
      .filter((x): x is string => Boolean(x));
    const allHaveLot = children.length > 0 && children.every((c) => Boolean(pick(c).lotId));

    if (allHaveLot && children.length >= 2) {
      // Lot-distributed: amount = sum of each child's row total (naturally
      // includes the remainder lot's rounded cents). Display unitCost = modal
      // (most common) child rate, shown as the per-lot value.
      const amount = roundCents(
        children.reduce((s, c) => {
          const n = pick(c);
          return s + rowTotal(n.quantity, n.unitCost);
        }, 0),
      );
      const totalQty = children.reduce((s, c) => s + (pick(c).quantity || 0), 0);
      const cleanQty = Math.round(totalQty * 100) / 100;
      const counts = new Map<number, number>();
      for (const c of children) {
        const u = pick(c).unitCost;
        counts.set(u, (counts.get(u) || 0) + 1);
      }
      let modalUnit = pick(children[0]).unitCost;
      let best = -1;
      for (const [u, n] of counts.entries()) {
        if (n > best) {
          best = n;
          modalUnit = u;
        }
      }
      const lotCount = Math.max(lotIds.length, children.length, 1);
      return {
        key,
        children,
        isGrouped: true,
        quantity: cleanQty,
        unitCost: modalUnit,
        amount,
        lotCost: amount / lotCount,
        lotIds,
      };
    }

    // Non-lot path: unchanged.
    const firstN = pick(children[0]);
    const totalQty = children.reduce((s, c) => s + (pick(c).quantity || 0), 0);
    const cleanQty = Math.round(totalQty * 100) / 100;
    const amount = rowTotal(cleanQty, firstN.unitCost);
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
