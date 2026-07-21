
## Problem

The on-screen Balance Sheet correctly shows **Atlantic Union Bank $101,788.21** and **Accounts Payable $23,956.75** as of 1/31/2026. The Balance Sheet PDF emailed from the Send Reports dialog shows different numbers for the same date and project.

## Root cause

`src/components/accounting/SendReportsDialog.tsx` builds its own Balance Sheet dataset before generating the PDF. That code drifted from `BalanceSheetContent.tsx` in three ways that directly affect the Bank and A/P numbers:

1. **Project scoping is wider.** PDF path uses `.or('project_id.eq.<id>,project_id.is.null')`, so it pulls in company-level (null-project) journal lines that the on-screen report intentionally excludes (`.eq('project_id', projectId)`).
2. **Reversal filter is not as-of-aware.** PDF path filters `reversed_at is null` unconditionally, so an entry reversed *after* the As Of date is dropped from the historical PDF. On-screen uses `reversed_at is null OR reversed_at > asOfDate`.
3. **Consolidated bill-payment double adjustment.** PDF path adds a hand-rolled "subtract from bank, add to A/P" pass for `bill_payments` rows. On-screen no longer does this — it trusts the journal entries as they exist. This is what is skewing Bank and A/P specifically.
4. **No pagination.** PDF path uses a single Supabase query capped at 1000 rows. On-screen uses `fetchAllRows`. For any project with more than 1000 journal lines this silently truncates balances.

The on-screen Balance Sheet is correct and the user asked us not to touch it. Only the PDF generation is wrong.

## Fix

Change only the Balance Sheet PDF generation block inside `src/components/accounting/SendReportsDialog.tsx` (roughly lines 151–341) to compute the exact same dataset the on-screen `BalanceSheetContent` computes, then hand that dataset to `BalanceSheetPdfDocument` unchanged.

Concretely, in that block:

- Fetch accounts with the same filter the screen uses: `is_active = true` and `project_id is null OR project_id = <projectId>`.
- Fetch project exclusions and apply them with the same rule as on-screen (only hide excluded balance-sheet accounts when their balance is effectively zero; always drop excluded revenue/expense).
- Build the journal-lines query identical to on-screen:
  - `entry_date <= asOfDate`
  - `is_reversal = false`
  - `reversed_by_id is null`
  - `reversed_at is null OR reversed_at > asOfDate` (referenced table `journal_entries`)
  - `project_id = <projectId>` (strict equality, not `or null`)
- Page through results with `fetchAllRows` (same helper the screen uses) instead of a single capped query.
- Remove the consolidated `bill_payments` fetch and the manual "subtract from bank / add to A/P" adjustment loop entirely.
- Keep the existing bucketing into assets / liabilities / equity, the Current Year Earnings equity row, `compareCostCodes` sort, and the totals math — those already match the screen.

No changes to `BalanceSheetPdfDocument.tsx`, `BalanceSheetContent.tsx`, the email edge function, or any on-screen report.

## Out of scope

- Income Statement, Job Costs, and A/P Aging PDFs. The user only reported the Balance Sheet PDF being wrong; leave the other generators alone this pass.
- On-screen Balance Sheet (user explicitly said not to change the application).

## Verification

After the change, open Send Reports for the same project with As Of = 1/31/2026, generate the Balance Sheet PDF, and confirm:
- Atlantic Union Bank = **$101,788.21**
- Accounts Payable = **$23,956.75**
- Totals match the on-screen report exactly.
