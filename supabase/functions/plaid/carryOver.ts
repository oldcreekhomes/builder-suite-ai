export type MappedAccount = { mask: string | null; project_id: string | null; account_id: string | null };
export type NewAccount = { id: string; mask: string | null; project_id: string | null };

/**
 * When a bank is signed into again, each job keeps its link: an unassigned account on the
 * new sign-in takes over the job of the old account with the same last-4 digits.
 */
export function planCarryOver(oldAccounts: MappedAccount[], newAccounts: NewAccount[]) {
  const byMask = new Map<string, MappedAccount>();
  for (const o of oldAccounts) {
    if (o.mask && o.project_id && o.account_id && !byMask.has(o.mask)) byMask.set(o.mask, o);
  }
  const updates: { id: string; project_id: string; account_id: string }[] = [];
  for (const n of newAccounts) {
    if (n.project_id || !n.mask) continue;
    const o = byMask.get(n.mask);
    if (o) updates.push({ id: n.id, project_id: o.project_id!, account_id: o.account_id! });
  }
  return updates;
}
