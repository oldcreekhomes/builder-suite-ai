export interface SelectableAccount {
  id: string;
  code: string;
  name: string;
  parent_id?: string | null;
  is_active?: boolean;
}

/**
 * Returns a Set of account ids that have at least one active child within the
 * provided account list. A parent is only considered "blocked" when a visible
 * child exists in the current context (e.g. after type / project filters).
 */
export function getParentAccountIds(accounts: Pick<SelectableAccount, 'id' | 'parent_id' | 'is_active'>[]): Set<string> {
  const activeChildParentIds = new Set<string>();
  for (const account of accounts) {
    if (account.is_active === false) continue;
    if (account.parent_id) {
      activeChildParentIds.add(account.parent_id);
    }
  }
  return activeChildParentIds;
}

export function isAccountSelectable(
  account: Pick<SelectableAccount, 'id' | 'parent_id' | 'is_active'>,
  parentIds: Set<string>
): boolean {
  return !parentIds.has(account.id);
}
