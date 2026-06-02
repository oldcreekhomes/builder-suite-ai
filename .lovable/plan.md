## Problem

In `src/components/reports/BalanceSheetContent.tsx` (line 398), parent accounts that have children — like `2905: Equity` — only toggle the expand/collapse chevron when clicked. They never open the `AccountDetailDialog`, so the equity ledger can't be viewed.

Leaf accounts (no children) open the dialog correctly. Same issue applies to any future parent account with children across Assets / Liabilities / Equity.

## Fix

Split the click target on each parent row:

- **Chevron icon** (left) — toggles expand/collapse only.
- **Account name + balance** (rest of the row) — opens `AccountDetailDialog` with the parent account's own ledger.

Leaf-account behavior is unchanged (entire row opens dialog).

## Changes

**File:** `src/components/reports/BalanceSheetContent.tsx` (renderHierarchicalAccounts, ~lines 394-406)

- Remove the row-level `onClick` for parent rows.
- Wrap the chevron in its own clickable element that calls `toggleExpanded(root.id)` and `stopPropagation`.
- Wrap the name + balance spans in a clickable container that calls `onSelect(root)`.
- Keep the existing hover styling on the row.

No changes to data fetching, `AccountDetailDialog`, or child-row rendering.

## Verification

1. Open `/project/:id/accounting/reports` → Balance Sheet.
2. Click the chevron next to `2905: Equity` → row expands to show `2905.1` and `2905.2` (no dialog opens).
3. Click the text `2905: Equity` (or its balance) → `AccountDetailDialog` opens with the equity ledger.
4. Click a leaf account (e.g., `1015: Capital One`) → dialog opens as before.
5. Click a child row (e.g., `2905.1: Equity Partner #1`) → dialog opens as before.
