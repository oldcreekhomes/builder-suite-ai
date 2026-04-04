

## Rename "Memo" to "Description" and Fix A/P Report Description Column

### Problem
1. The A/P detail report's Description column shows reference numbers (e.g., "AP - 70200008360") instead of the actual bill line description that the user enters
2. The word "Memo" is used throughout the bill entry/edit UI — the user wants it renamed to "Description" for clarity

### Root Cause
In `AccountDetailDialog.tsx` line 704, for bill transactions the description is set to `line.memo || bill.reference_number`. The `line.memo` is the journal entry line memo (often empty), and the fallback is the reference number. The actual bill line memo (what the user types in the description field) is fetched but never extracted — unlike checks/deposits which extract `firstLineMemo`, the bills map omits it.

### Fix

**Part 1: Fix the A/P description to show the bill line memo**

In `AccountDetailDialog.tsx`:
- Extract `firstLineMemo` from the bills map (same pattern as checks/deposits — get the first bill line's memo)
- On line 704, change the description priority to: `bill.firstLineMemo || line.memo || bill.reference_number || description`

**Part 2: Rename "Memo" to "Description" in bill-related UI**

Update column headers and placeholder text in these files:
- `src/components/bills/ManualBillEntry.tsx` — header labels "Memo" → "Description", placeholder "Job cost memo" → "Description", "Expense memo" → "Description"
- `src/components/bills/EditBillDialog.tsx` — same pattern: headers and placeholders
- `src/components/bills/EditExtractedBillDialog.tsx` — table headers
- `src/components/bills/BatchBillLineItems.tsx` — column headers
- `src/components/bills/BatchBillReviewTable.tsx` — table headers
- `src/components/bills/BillsApprovalTable.tsx` — table header

Note: Checks, deposits, and journal entries also use "Memo" but the user specifically asked about bills. The internal data field name (`memo`) stays the same — only UI labels change.

### Files changed
- `src/components/accounting/AccountDetailDialog.tsx` — fix description sourcing for bills
- `src/components/bills/ManualBillEntry.tsx` — rename labels
- `src/components/bills/EditBillDialog.tsx` — rename labels
- `src/components/bills/EditExtractedBillDialog.tsx` — rename labels
- `src/components/bills/BatchBillLineItems.tsx` — rename labels
- `src/components/bills/BatchBillReviewTable.tsx` — rename labels
- `src/components/bills/BillsApprovalTable.tsx` — rename labels

