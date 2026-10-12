/** Keep independent checks separate; only explicit split IDs form a group. */
export function groupCheckRows<T extends { splitGroupId: string }>(rows: T[]): T[][] {
  const groups: T[][] = [];
  const seen = new Map<string, T[]>();
  for (const row of rows) {
    const existing = row.splitGroupId ? seen.get(row.splitGroupId) : undefined;
    if (existing) existing.push(row);
    else {
      const group = [row];
      groups.push(group);
      if (row.splitGroupId) seen.set(row.splitGroupId, group);
    }
  }
  return groups;
}

export function checkGroupTotal(rows: { amount: string }[]): number {
  return rows.reduce((sum, row) => sum + Math.round((Number(row.amount) || 0) * 100), 0) / 100;
}

/** Integer cents, with the remainder on the final lot, matching bill entry. */
export function splitCheckAmount(amount: string, count: number): string[] {
  if (count < 1) return [];
  const cents = Math.round((Number(amount) || 0) * 100);
  const perLot = Math.floor(cents / count);
  return Array.from({ length: count }, (_, i) =>
    ((i === count - 1 ? cents - perLot * (count - 1) : perLot) / 100).toFixed(2),
  );
}