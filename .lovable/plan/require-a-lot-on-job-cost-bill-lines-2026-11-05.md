# Require a Lot on job cost bill lines

## The issue in one sentence
Some job cost lines were saved without a lot, and the lot reports had no way to know which lot they belong to.

## 1. Bills can't be saved without a Lot (job cost lines only)
- Applies everywhere a bill is entered or changed: Enter Bills, uploaded/extracted bill review, Edit Bill, and approving bills from the review table.
- Job cost line with no lot: the Lot box turns red with "Pick a lot", and Save/Approve stays blocked until it's filled.
- Expense lines: no lot needed, same as today.
- Jobs with only one lot: that lot fills in automatically, nothing to pick.
- A safety check in the database also refuses to save a job cost bill line without a lot on jobs with 2+ lots, so nothing can slip around the screens.

## 2. Undo the even split in the lot reports
- Remove the 50/50 split I added a few minutes ago.
- Each lot shows only the costs actually tagged to that lot.
- Costs with no lot show on a separate "Unassigned" line, so the lots plus Unassigned always equal the job total and nothing is guessed.
- Same on screen, PDF, and emailed Job Costs.

## 3. Existing untagged lines (not changed automatically)
Recent untagged job cost lines on jobs with 2+ lots: 66 on bills, 14 on checks, 110 on manual journal entries. I'll give you a list per job so you can tell me the right lot for each one; nothing is guessed.

## Not included (tell me if you want them)
Checks, credit cards, and manual journal entries can still save job cost lines without a lot. The same rule could be added there next.

## Technical details
- Shared validator `src/lib/billLotRequired.ts` (job_cost line + project lot count > 1 => lot_id required), used in `ManualBillEntry.tsx`, `EditExtractedBillDialog.tsx`, `EditBillDialog.tsx`, `BatchBillReviewTable.tsx`/approve path in `useBills.ts`/`usePendingBills.ts`.
- Validation trigger on `bill_lines` (and `pending_bill_lines` at approval) raising when `line_type='job_cost'`, `lot_id is null`, and the project has more than one lot; existing rows are untouched (insert/update of those fields only).
- Replace `src/lib/jobCostLotAllocation.ts` logic: lot view = exact lot matches; null-lot totals returned separately and rendered as an "Unassigned" row; update tests and the AGENTS.md rule.
