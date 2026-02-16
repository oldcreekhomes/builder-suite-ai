/**
 * Utility for grouping accounts into a parent/child hierarchy.
 * Accounts with parent_id = null are root accounts.
 * Children are grouped under their parent's id.
 */

export interface HierarchicalAccount {
  id: string;
  code: string;
  name: string;
  type: string;
  parent_id?: string | null;
  [key: string]: any;
}

export interface AccountHierarchy<T extends HierarchicalAccount> {
  roots: T[];
  childrenMap: Record<string, T[]>;
}

/**
 * Groups a flat list of accounts into root accounts and a map of parentId -> children.
 * Both roots and children are kept in their original order (typically sorted by code).
 */
export function groupAccountsByParent<T extends HierarchicalAccount>(accounts: T[]): AccountHierarchy<T> {
  const childrenMap: Record<string, T[]> = {};
  const roots: T[] = [];

  for (const account of accounts) {
    if (account.parent_id) {
      if (!childrenMap[account.parent_id]) {
        childrenMap[account.parent_id] = [];
      }
      childrenMap[account.parent_id].push(account);
    } else {
      roots.push(account);
    }
  }

  return { roots, childrenMap };
}

/**
 * Flattens a hierarchical account list into a display-ready array,
 * with each entry annotated with its depth level (0 = root, 1 = child).
 */
export function flattenAccountHierarchy<T extends HierarchicalAccount>(
  accounts: T[]
): Array<T & { _depth: number }> {
  const { roots, childrenMap } = groupAccountsByParent(accounts);
  const result: Array<T & { _depth: number }> = [];

  for (const root of roots) {
    result.push({ ...root, _depth: 0 });
    const children = childrenMap[root.id];
    if (children) {
      for (const child of children) {
        result.push({ ...child, _depth: 1 });
      }
    }
  }

  return result;
}
