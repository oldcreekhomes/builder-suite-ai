
# Balance Sheet bank balance doesn't match reconciliation — root cause & fix

## What's wrong

On 115 E. Oceanwatch, as of Jan 31, 2026:

- Bank reconciliation ending balance: **$101,788.21** ✓ (matches bank statement)
- Balance Sheet shows Atlantic Union Bank: **$72,722.47** ✗
- Off by **$29,065.74** (against the reconciliation) / **$36,072.94** (against the true book balance)

## Root cause (verified in DB)

For this bank + project, as of 2026-01-31:

| Source | Amount |
|---|---|
| Raw journal‑entry activity on the bank | **+$108,795.41** (this is the true book balance) |
| bill_payment JE lines the BS *suppresses* | −$206,026.91 |
| Consolidated `bill_payments.total_amount` the BS *re‑adds* | −$242,099.85 |
| Result the BS shows | **$72,722.47** ← wrong |

`src/components/reports/BalanceSheetContent.tsx` (lines ~125–203) does a "consolidated payments" swap: it removes every journal line whose `source_type='bill_payment'` and whose `source_id` is any bill in a consolidated payment, then re‑posts `bill_payments.total_amount` as a single credit on the bank and matching debit to A/P.

That swap assumes the removed JE credits sum **exactly** to `bill_payments.total_amount`. On this project they don't — payments exist where the JE credits the bank less than `total_amount` (e.g. bill_payment `7c530693…` on 2025‑12‑15: `total_amount = $11,270.97`, actual JE bank credit = $4,263.77, gap = $7,007.20; plus several older 2025‑01‑09 payments with swapped/mismatched amounts). Those legacy data gaps are being amplified into a ~$36k over‑credit to the bank on the BS, which is why the reconciliation ties to the bank statement but the BS doesn't tie to the reconciliation.

Reconciliations look right because they read the actual JE‑derived register, not the swapped values.

## Fix

Remove the "consolidated payments" swap from the Balance Sheet and rely on the actual journal entries — the same approach used by reconciliations and the register (which already agree with the bank).

In `src/components/reports/BalanceSheetContent.tsx`:

1. Delete `buildConsolidatedPaymentsQuery`, the `consolidatedBillIds` fetch, the `journal_entry_lines` suppression branch inside the `forEach`, and the "apply each consolidated bill payment as a balanced replacement entry" block.
2. Keep the plain aggregation: `accountBalances[account_id] += debit − credit` over every non‑reversed journal line ≤ asOf date.
3. Leave the accounts / exclusions / hierarchy / render logic untouched.

Expected result on this project after the fix:

- Atlantic Union Bank (Balance Sheet, as of 1/31/2026): **$108,795.41** (matches JE register)
- Reconciliation ending balance stays **$101,788.21** — the remaining ~$7k gap is the normal outstanding‑items difference (uncleared checks/deposits), exactly what a book‑vs‑bank reconciliation is supposed to show.
- Totals across the BS still balance because A/P and every other account keep using the same raw JE aggregation.

## Verify

1. Reload `/project/<id>/accounting/reports` → Balance Sheet, As of 1/31/2026, and confirm Atlantic Union Bank shows the JE‑register value.
2. Spot‑check a second month (e.g. 5/31/2026 → reconciled ending $18,936.79; BS should show book balance ≥ that, with the difference equal to outstanding items).
3. Confirm Total Assets = Total Liabilities + Equity still holds (no swap means A/P is unchanged too).

## Not in scope (call out separately)

The legacy `bill_payments` rows where `total_amount` disagrees with the sum of their allocations / JE credits (5 rows identified, oldest from 2025‑01‑09, one from 2025‑12‑15) are a separate data‑integrity issue. Removing the swap stops the BS from being wrong today; cleaning those specific payment records can be done later without touching report code.
