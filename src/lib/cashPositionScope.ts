export type CashPositionScope = "company" | "accounting-manager";

export function scopeCashPositionRows<T extends { project_id: string }>(
  rows: T[],
  projects: { id: string; accounting_manager?: string | null }[],
  scope: CashPositionScope,
  userId?: string,
): T[] {
  if (!userId) return [];
  if (scope === "company") return rows;
  const assignedIds = new Set(
    projects.filter((p) => p.accounting_manager === userId).map((p) => p.id),
  );
  return rows.filter((r) => assignedIds.has(r.project_id));
}

export function cashPositionTotals(rows: { bank_balance: number; approved_due: number }[]) {
  const bankCents = rows.reduce((sum, r) => sum + Math.round(r.bank_balance * 100), 0);
  const dueCents = rows.reduce((sum, r) => sum + Math.round(r.approved_due * 100), 0);
  return { bank: bankCents / 100, due: dueCents / 100, net: (bankCents - dueCents) / 100 };
}