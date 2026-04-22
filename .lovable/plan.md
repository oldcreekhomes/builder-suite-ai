
## Fix the real mismatch: Balance Sheet / 2010 detail vs A/P Aging are using different logic

### What the screenshots prove
The Balance Sheet and the 2010 Accounts Payable detail dialog already agree at **$161,894.60**.  
So the bug is not in the ledger total. The bug is that the **A/P Aging report is still using its own custom bill-aging pipeline instead of the exact same A/P source-of-truth pattern**.

### Root cause in code
There are two separate implementations right now:

- `src/components/reports/BalanceSheetContent.tsx`
  - totals liabilities from `journal_entry_lines` using the canonical as-of reversal filter
- `src/components/accounting/AccountDetailDialog.tsx`
  - shows the 2010 detail from the exact clicked account id and builds the running balance from those same ledger lines
- `src/components/reports/AccountsPayableContent.tsx`
  - does a separate “rebuild open bills” flow from `bills` + remapped GL-by-source logic
  - resolves A/P by `code = '2010'` instead of the exact account row the company is actually using
  - still has its own fallback / remapping behavior, so it can diverge even when the ledger detail is correct
- `src/components/accounting/SendReportsDialog.tsx`
  - still uses the old `total_amount - paidAsOfDate` PDF logic, so exported A/P can also disagree

### Implementation plan

#### 1. Make A/P Aging use the same A/P account source as the ledger detail
In `src/components/reports/AccountsPayableContent.tsx`:
- stop resolving A/P with a broad `accounts.code = '2010'` lookup
- resolve the actual A/P account from the company’s accounting setup first (`accounting_settings.ap_account_id`)
- use that exact account id for all A/P journal-line calculations, just like the 2010 detail dialog does

This removes the “maybe it picked the wrong 2010 row” class of bugs completely.

#### 2. Derive the report from the A/P ledger, then map back to unpaid bills
Still in `AccountsPayableContent.tsx`:
- fetch A/P journal lines for the exact A/P account id, project, and as-of date using the same canonical filters as Balance Sheet / Account Detail
- separate:
  - bill postings (`source_type = 'bill'`)
  - bill payment reductions (`source_type = 'bill_payment'`)
- compute each bill’s open amount from those ledger movements
- then join those open amounts back to bill metadata (`bill_date`, vendor, due date, attachments, lot lines) for display

That makes the aging report a presentation of the same ledger truth instead of a parallel accounting system.

#### 3. Remove the custom fallback paths that are masking the real issue
In `AccountsPayableContent.tsx`:
- remove the “legacy fallback” path that substitutes `total_amount - amount_paid` when GL data is missing
- remove the broad `code='2010'` multi-account aggregation
- keep predecessor-chain mapping only if it is actually needed for reversed/replaced bills after rebuilding from the exact A/P ledger
- if a bill exists in bills but has no matching A/P ledger posting, surface it as a reconciliation problem instead of silently folding it in

That way the report cannot quietly drift away from the ledger again.

#### 4. Make the reconciliation visible and actionable
In `AccountsPayableContent.tsx`:
- compare:
  - A/P Aging grand total
  - exact A/P ledger net for the same account / project / as-of date
- if different by more than $0.01, show a prominent warning with the difference
- add targeted debug output listing:
  - bills present in aging but not in ledger
  - bills present in ledger but missing from aging
  - bills whose open balance differs between the two calculations

This gives a precise bill-level explanation if data is ever inconsistent again.

#### 5. Update the emailed/exported A/P report to the same logic
In `src/components/accounting/SendReportsDialog.tsx`:
- replace the old A/P PDF generation path that still uses `total_amount - paidAsOfDate`
- reuse the same ledger-derived aging calculation as the on-screen A/P report

This keeps UI and PDF consistent, which is required by the project’s report-integrity rules.

### Files to update
- `src/components/reports/AccountsPayableContent.tsx`
- `src/components/accounting/SendReportsDialog.tsx`

### Verification
After the fix, for the same project and same as-of date:
- Balance Sheet 2010 A/P total = **$161,894.60**
- 2010 Accounts Payable detail dialog total = **$161,894.60**
- A/P Aging report total outstanding = **$161,894.60**
- exported / emailed A/P PDF = **$161,894.60**

Also verify that the final bill list in A/P Aging matches the unpaid bill population implied by the 2010 ledger detail for that date.
