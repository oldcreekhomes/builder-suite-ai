# Paid at Purchase terms + archived bills never late

## 1. New Terms choice: "Paid at Purchase"
- Add **Paid at Purchase** to the Terms dropdown next to Net 15 / Net 30 / Net 60 / Due on Receipt, wherever bills are entered or edited (Enter Bills, Edit Bill, the bill review screens after upload).
- A bill with Paid at Purchase terms is **never late**:
  - not counted in the red Late circle on Active Jobs,
  - not listed as late on the Bill Issues tab,
  - its due date is never red in Manage Bills.
- If such a bill is rejected, it still shows as Rejected (a rejection is a real problem).
- Existing Amazon, grocery store and other debit card bills stay as they are. Switch each one to Paid at Purchase in Edit Bill, or ask me to update a list of vendors for you in one go.

## 2. Archived bills are never late
- The Late / Rejected counts and the Bill Issues tab already leave out archived bills. I'll keep it that way and check it with a test.
- **New:** the Archived view in Manage Bills will stop showing archived bills' due dates in red.

## Technical details
- Terms value `paid-at-purchase` (bills.terms is free text, so no database change). Add the option to `ManualBillEntry.tsx`, `EditBillDialog.tsx`, `EditExtractedBillDialog.tsx`, `BatchBillReviewTable.tsx`, and the label maps in `BillsApprovalTabs.tsx`/`BillsApprovalTable.tsx`.
- `isLateBill` in `src/lib/billIssues.ts` returns false when `terms === 'paid-at-purchase'` or `archived_at` is set. `useBillCountsByProject` and the Bill Issues query select `terms`.
- `BillsApprovalTable.tsx` turns off the red due date when `archived` is on or the bill's terms are Paid at Purchase.
- Add tests to `billIssues.test.ts` for both rules.
