

## Add Edit Check Dialog for Account Detail Dialog

The Account Detail Dialog currently only shows a "Delete" action for check transactions in the dropdown menu. Bill and deposit transactions already have Edit actions that open inline edit dialogs. We need to create an equivalent `EditCheckDialog` for checks.

### What's happening now
- The `TableRowActions` in `AccountDetailDialog.tsx` (line 1211) only adds Edit for `bill` and `deposit` source types
- There is no `EditCheckDialog` component in the codebase
- The `useChecks` hook already has a working `updateCheck` mutation that supports updating date, check number, pay to, memo, amount, and check lines

### Plan

**1. Create `src/components/checks/EditCheckDialog.tsx`**
- Follow the same pattern as `EditDepositDialog` (dialog-based inline editor)
- Load check data + check_lines via a query keyed on `checkId`
- Form fields: Check Date, Pay To, Check Number, Memo, Bank Account (read-only)
- Two tabs: Job Cost lines and Expense lines (matching WriteChecks page structure)
- Each line: Account/Cost Code, Project, Amount, Memo, Lot (if applicable)
- Save button calls `updateCheck` from `useChecks`
- Follow the `shadcn-native` dialog standard (max-w-6xl, dense layout)

**2. Update `src/components/accounting/AccountDetailDialog.tsx`**
- Import `EditCheckDialog`
- Add `editingCheckId` state (alongside existing `editingBillId` and `editingDepositId`)
- Extend `handleEditTransaction` to handle `source_type === 'check'`
- Add the Edit action for check transactions in the `TableRowActions` (line 1211): change `['bill', 'deposit']` to `['bill', 'deposit', 'check']` with appropriate label
- Render the `EditCheckDialog` component with proper close/invalidation handler

