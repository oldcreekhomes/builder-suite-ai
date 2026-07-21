# Plan: Fix the StraightTalk bill approval and expense cost-code display

## What is happening
- The StraightTalk $15.00 bill is stuck in the Review tab.
- Its Cost Code column shows "-" instead of the account.
- Clicking Approve does not move it to Approved.

## Root cause found
- The bill row exists in `bills` with `total_amount = 15.00` and `status = draft`.
- It has **zero rows** in `bill_lines`.
- When Approve runs, it tries to create a journal entry from the bill lines. With no lines, the journal entry is unbalanced (only an AP credit), so the post silently fails and the bill stays in Review.
- The empty Cost Code cell is a side effect of having no lines.

## What we will do

### 1. Restore the missing bill line (data fix)
Insert one expense line for the StraightTalk bill:
- Bill ID: `58b851e0-6450-4cd4-8e10-3679068898d5`
- Account: `5160 - Phone` (`cf2fc443-5dee-4251-a020-6ae272ae2c4f`)
- Amount: `15.00`
- Line type: `expense`
- Project: the bill's project

### 2. Make expense bills show the account in the Cost Code column
Update the shared `getBillCostCodeDisplay` helper so that expense lines fall back to the account code/name when no cost code is present. This makes the Review/Approved tables consistent: expense bills display the account just like job-cost bills display the cost code.

### 3. Prevent approve when a bill has no lines
Add a preflight check in the approve/post flow:
- If a bill has `total_amount > 0` but zero bill lines, block approval.
- Show a clear toast: "This bill has no line items. Open the bill, add the account/cost code, and save before approving."

### 4. Harden the bill update so lines are never silently lost
The current `updateBill` mutation deletes all existing `bill_lines` before inserting the new set. If the insert fails, the bill is left with no lines. We will add validation and ordering:
- Validate that the incoming `billLines` array is non-empty for non-zero bills before deleting existing lines.
- If the insert fails, do not leave the bill header in a broken state (return early so the user sees the error and can retry).

## Files to change
- `src/lib/billListDisplay.ts` — expense account fallback in cost-code display.
- `src/hooks/useBills.ts` — preflight check in `approveBill`/`postBill`; safer ordering in `updateBill`.

## Data change
- One `INSERT` into `bill_lines` for the StraightTalk bill.

## Outcome
- StraightTalk bill shows `5160 - Phone` in the Cost Code column.
- Approve moves it to the Approved tab and creates a balanced journal entry.
- Future bills cannot be approved if their lines were lost.
- Editing a bill will no longer leave it with zero lines if the save fails.