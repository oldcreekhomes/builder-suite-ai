

## Collapse Sub-Accounts by Default on Balance Sheet and Income Statement

### Overview
On the Balance Sheet (and Income Statement), sub-accounts are currently always shown expanded. The change will default to showing only parent accounts with their rolled-up totals. Users can click a parent to expand/collapse its children.

### Changes

**`src/components/reports/BalanceSheetContent.tsx`**
- Add a `useState<Set<string>>` to track which parent accounts are expanded (default: empty set = all collapsed)
- Update `renderHierarchicalAccounts` to:
  - For parent accounts that have children: show a small expand/collapse chevron icon, and display the **rolled-up total** (parent's own balance + sum of children)
  - Only render child rows when the parent's ID is in the expanded set
  - Clicking the chevron (or the parent row) toggles expand/collapse
  - Parent accounts without children render as before (no chevron, clickable for detail dialog)
  - Child rows remain indented with the `↳` prefix and are individually clickable for detail

**`src/components/reports/IncomeStatementContent.tsx`**
- Same pattern: add expand/collapse state and update `renderHierarchicalAccounts` identically

### Behavior
- **Default view**: Only parent-level accounts visible, showing rolled-up balances (parent + children summed)
- **Expanded view**: Click a parent row to reveal its sub-accounts indented beneath it
- Section totals (Total Assets, Total Equity, etc.) remain unchanged -- they already sum all accounts
- Accounts without children behave exactly as they do today

### Technical Detail
- The parent row balance changes from showing only the parent's direct postings to showing `parent.balance + sum(children.balance)` when collapsed
- When expanded, the parent shows its own direct balance and each child shows individually
- A small `ChevronRight`/`ChevronDown` icon from lucide-react indicates expandability

