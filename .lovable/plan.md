

## Add Edit Check Support to Job Cost Actual Dialog

The `JobCostActualDialog` (used from Job Costs report) already enriches check data with payee names and reconciled status, but never stores a `check_id` on the enriched lines and doesn't offer an Edit action for checks. The `AccountDetailDialog` (Balance Sheet, Income Statement) already has full Edit support for bills, deposits, and checks.

### Changes

**`src/components/reports/JobCostActualDialog.tsx`**

1. **Add `check_id` to the `JournalEntryLine` interface** (alongside existing `bill_id` and `deposit_id`)

2. **Set `check_id` during enrichment** (around line 247-250): Add `check_id = sourceId` when `sourceType === 'check'`, same pattern as `bill_id` and `deposit_id`

3. **Include `check_id` in the return mapping** (around line 258-266): Add `check_id` to the returned object

4. **Add `editingCheckId` state** alongside existing `editingBillId` and `editingDepositId`

5. **Add `handleEditCheck` function** and corresponding close handler with query invalidation

6. **Update the actions column** (line 437-441): Extend the condition from `(line.bill_id || line.deposit_id)` to `(line.bill_id || line.deposit_id || line.check_id)` and add the check edit action to the `TableRowActions` array

7. **Import and render `EditCheckDialog`** after the existing `EditDepositDialog`, with proper open/close/invalidation wiring

