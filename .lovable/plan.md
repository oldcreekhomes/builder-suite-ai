

## Replace Inline Editing with 3-Dot Dropdown + Fix Lock Icons in Report Dialogs

### Problem
Two issues in the financial report detail dialogs (Balance Sheet, Income Statement, Job Cost):
1. The `AccountDetailDialog` uses inline editing (pencil icons on hover) and a standalone red trash icon, which doesn't match the standardized 3-dot `TableRowActions` dropdown used everywhere else
2. Both `AccountDetailDialog` and `JobCostActualDialog` use the `🔒` emoji for locked/reconciled rows instead of the standard disabled `TableRowActions` pattern (grayed-out dots)

### Changes

**1. `src/components/accounting/AccountDetailDialog.tsx`**
- Remove all `AccountTransactionInlineEditor` usage -- replace Date, Name, and Description cells with plain read-only text (the actual editing happens via the Edit dialog, not inline)
- Remove `DeleteButton` from the Actions column
- Add `TableRowActions` dropdown with:
  - **Edit** action: Opens `EditBillDialog` (for bills), `EditDepositDialog` (for deposits). For checks, credit cards, and journal entries where no edit dialog exists, disable the Edit action
  - **Delete** action: Destructive, with confirmation dialog, calls the existing `handleDelete` logic
- When a row is reconciled or date-locked, show a **disabled** `TableRowActions` (grayed-out dots with tooltip) instead of the `🔒` emoji
- Add state for `editingBillId` and `editingDepositId` (same pattern as `JobCostActualDialog`)
- Add `EditBillDialog` and `EditDepositDialog` renders at the bottom

**2. `src/components/reports/JobCostActualDialog.tsx`**
- Replace the `🔒` emoji lock with the disabled `TableRowActions` component (grayed-out dots)
- Add "Delete" as a destructive action in the existing `TableRowActions` dropdown (currently only has Edit)
- For rows without a bill_id or deposit_id, show a disabled `TableRowActions` or just the delete option for manual journal entries

### Lock Icon Standard
The disabled state of `TableRowActions` (from `table-row-actions.tsx`) already renders a grayed-out `MoreHorizontal` icon when `disabled={true}`. This will replace all `🔒` emoji usage in both dialogs. The tooltip explaining why it's locked will be preserved by wrapping the disabled `TableRowActions` in a `Tooltip`.

### Files Changed
| File | Change |
|---|---|
| `src/components/accounting/AccountDetailDialog.tsx` | Replace inline editing + DeleteButton + 🔒 with TableRowActions dropdown |
| `src/components/reports/JobCostActualDialog.tsx` | Replace 🔒 with disabled TableRowActions, add Delete action |

