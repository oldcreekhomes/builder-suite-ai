/**
 * Job cost bill lines must name a lot when the job has more than one lot.
 * Expense lines never need a lot. Returns 1-based line numbers missing a lot.
 */
export function jobCostLinesMissingLot(
  lines: Array<{ lotId?: string | null; amount?: string | number | null }>,
  projectLotCount: number,
): number[] {
  if (projectLotCount <= 1) return [];
  const missing: number[] = [];
  lines.forEach((line, i) => {
    const amt = typeof line.amount === 'number' ? line.amount : parseFloat(line.amount || '0') || 0;
    if (amt !== 0 && !line.lotId) missing.push(i + 1);
  });
  return missing;
}

export const missingLotMessage = (lines: number[]) =>
  `Pick a lot for job cost line${lines.length > 1 ? 's' : ''} ${lines.join(', ')}.`;
