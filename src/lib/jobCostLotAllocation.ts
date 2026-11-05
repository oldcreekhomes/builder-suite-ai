/**
 * Job cost lines with no lot belong to the whole project. When a single lot is
 * reported, give that lot only its even share (cent-exact, remainder on the
 * last lot) so the lots always add up to the project total.
 */
export function lotShareOfUnassigned(
  unassignedAmount: number,
  lotIds: string[],
  selectedLotId: string,
): number {
  const count = lotIds.length;
  if (count === 0) return unassignedAmount;
  const idx = lotIds.indexOf(selectedLotId);
  if (idx === -1) return 0;
  const totalCents = Math.round(unassignedAmount * 100);
  const base = Math.trunc(totalCents / count);
  const remainder = totalCents - base * count;
  const cents = idx === count - 1 ? base + remainder : base;
  return cents / 100;
}

export interface WipLineLike {
  cost_code_id: string | null;
  lot_id?: string | null;
  debit: number | null;
  credit: number | null;
}

/** Actuals per cost code for a project (no lot) or for one lot. */
export function actualsByCostCodeForLot(
  lines: WipLineLike[],
  selectedLotId: string | null | undefined,
  lotIds: string[],
): Record<string, number> {
  const assigned: Record<string, number> = {};
  const unassigned: Record<string, number> = {};
  for (const line of lines) {
    if (!line.cost_code_id) continue;
    const amt = (line.debit || 0) - (line.credit || 0);
    const target = !selectedLotId || line.lot_id ? assigned : unassigned;
    if (selectedLotId && line.lot_id && line.lot_id !== selectedLotId) continue;
    target[line.cost_code_id] = (target[line.cost_code_id] || 0) + amt;
  }
  const result: Record<string, number> = {};
  const ids = new Set([...Object.keys(assigned), ...Object.keys(unassigned)]);
  for (const id of ids) {
    const share = selectedLotId ? lotShareOfUnassigned(unassigned[id] || 0, lotIds, selectedLotId) : 0;
    result[id] = Math.round(((assigned[id] || 0) + share) * 100) / 100;
  }
  return result;
}
