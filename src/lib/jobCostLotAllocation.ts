/**
 * Job cost lines with no lot cannot be attributed to any lot. A single-lot
 * report shows only lines tagged to that lot; untagged lines are returned
 * separately so they can be shown as "Unassigned" without guessing.
 */
export const UNASSIGNED_GROUP = 'Unassigned - no lot (not in totals)';

export interface WipLineLike {
  cost_code_id: string | null;
  lot_id?: string | null;
  debit: number | null;
  credit: number | null;
}

export interface LotActuals {
  /** Actuals per cost code id for the selected lot (or whole project when no lot). */
  assigned: Record<string, number>;
  /** Actuals per cost code id with no lot (only filled when a lot is selected). */
  unassigned: Record<string, number>;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function actualsByCostCodeForLot(
  lines: WipLineLike[],
  selectedLotId: string | null | undefined,
  /** Number of lots on the job. With exactly one lot, untagged lines belong to it. */
  lotCount?: number,
): LotActuals {
  const assigned: Record<string, number> = {};
  const unassigned: Record<string, number> = {};
  for (const line of lines) {
    if (!line.cost_code_id) continue;
    const amt = (line.debit || 0) - (line.credit || 0);
    let target: Record<string, number>;
    if (!selectedLotId) target = assigned;
    else if (line.lot_id === selectedLotId) target = assigned;
    else if (!line.lot_id) target = lotCount === 1 ? assigned : unassigned;
    else continue;
    target[line.cost_code_id] = r2((target[line.cost_code_id] || 0) + amt);
  }
  return { assigned, unassigned };
}
