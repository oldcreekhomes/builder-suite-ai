
## Problem

On 115 E. Oceanwatch, the Balance Sheet as of 2/28/2026 shows Atlantic Union Bank at **$36,673.78**, but the bank statement ends at **$36,933.39** — a **$259.61** shortfall in our system.

The 1/31/2026 balance ($101,788.21) matches the statement's beginning balance exactly, so the entire discrepancy sits inside February.

## What I already found

- Feb 26, 2026 — JE `d72ad86e-a901-4fa8-8e5b-e6fdd9a5f756` "Credit applied - Ref: 2005904779-001" **debits the Atlantic Union Bank account $500.52** and credits account `f156…`. Per our vendor-credit rule, applying a vendor credit to a bill must **not** touch the cash/bank account — it should only shift AP and the credit-clearing account. This JE is almost certainly a code-path bug when a bill payment is fully or partially satisfied by a vendor credit.

That JE alone does not equal $259.61, so a second entry (or a missing deposit) is contributing. Investigation continues in step 1 below before any fix is applied.

## Plan

### Step 1 — Confirm the exact cause (no code changes)

1. Pull every 2/1–2/28/2026 line on the Atlantic Union Bank account for this project and diff it line-by-line against the bank statement transactions (117.33 deposit, 47 withdrawals, $15 service charge).
2. Identify:
   - Any entries in our system that are **not** on the statement (extra debits/credits like the $500.52 above).
   - Any statement transactions **missing** from our system (the "credit not counted for" the user referenced).
3. Confirm whether the $259.61 delta = (credit-applied JE incorrectly touching bank) minus (a missing deposit / credit), or two independent issues.

### Step 2 — One-time data correction for this project

Depending on what step 1 shows, use the `insert` tool to correct only the offending JEs on this project:

- If the $500.52 "Credit applied" JE was wrongly written to bank: reverse just the two lines of that JE and re-post it against the correct credit-clearing account (not bank).
- If a real bank deposit/credit is missing from our books: add the missing deposit for the exact amount and date shown on the statement.

Every change scoped to `project_id = f13eae11-ab55-4034-b70c-734fc3afe340` and the Atlantic Union Bank account. No blanket updates.

### Step 3 — Prevent recurrence in code

Find the bill-payment code path that generated the "Credit applied" JE with a bank debit line, and stop it from ever writing to the bank account when the payment source is a vendor credit. Likely candidates (to be confirmed by read):

- `src/hooks/useBillPayments.ts`
- `src/hooks/useBills.ts` (payMultipleBills / applyCredit paths)
- Any edge function that posts bill-payment JEs

The guard: when a bill-payment allocation's source is a vendor credit (not cash), the JE must debit AP and credit the credit-clearing account only — never the bank account.

### Step 4 — Verify

- Re-run the same balance query for 2/28/2026 and confirm it equals $36,933.39.
- Reload the Balance Sheet in the app for the same As-Of date and confirm the number matches.
- Spot-check that no other project's Atlantic Union Bank balance moved unexpectedly.

## Technical details

- Bank account IDs for code `1010`: `27ed0c3a-be95-4367-aa21-1a2b51ea1585` (Atlantic Union) and `9503f76b-fc90-4e47-a53b-4cdfc7a10e73`.
- Balance formula used and verified: `SUM(debit - credit)` on `journal_entry_lines` joined to `journal_entries` with `reversed_at IS NULL AND is_reversal = false`, filtered by `project_id` and `entry_date <= as_of`.
- No changes to the Balance Sheet report code — the report is reading correctly; the underlying JE data is wrong.

## What I will NOT touch

- Balance Sheet / reports code (already reconciled per prior work).
- Any other project's data.
- The reconciliation UI or bank statement upload flow.
