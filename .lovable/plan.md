## What you're seeing in the screenshot (4020 Project Manager)

Two different things are sharing one column, which is why it looks random:

- **2025 bills** (Jul–Dec) — green check + red lock. These have `bills.reconciled = true` written directly on the bill row (older data where the bill itself was marked reconciled on a bank rec).
- **Checks** (01/09, 02/06, 03/06, 04/11) — green check + red lock from `checks.reconciled = true`. Normal.
- **2026 bills** (02/03, 03/02, 03/31, 05/03) — blank. The bill row's `reconciled` flag is false, **but the check that paid it (right below it) is reconciled**. So the cost is real and cleared at the bank — the UI just isn't reflecting that on the bill row.
- **05/07 check** — blank because the May bank rec isn't done yet.

So today the green check on a bill only fires if someone happened to flag the bill row itself. That's inconsistent with reality, because what actually clears the bank is the **payment** (check or JE), not the bill.

## What we want

> "If it happened and it's real, I need to know" — treat a bill as cleared whenever the money that paid it has cleared the bank.

One simple rule for every row in the Account Detail dialog:

- **Green check ✓** = this cost has been confirmed against a bank statement.
  - Check / JE line → its own `reconciled` flag (unchanged).
  - **Bill** → derived: fully paid AND every payment that paid it is reconciled. Partially paid or unpaid bills stay blank.
- **Red lock 🔒** = the row's date is inside a closed accounting period (unchanged). Workflow-wise you reconcile first, then close — but the lock is still rendered from closed-period data, not from the check.

## Fix

In `src/components/accounting/AccountDetailDialog.tsx` (and the hook that feeds it):

1. For every **bill** row, look up its payments via `bill_payments` → `checks` / `journal_entry_lines`.
2. Compute `derivedReconciled = isFullyPaid (cent-precise) AND every payment.reconciled === true`.
3. Render the green check from `bill.reconciled || derivedReconciled`. (Keeping the existing flag means the 2025 bills in your screenshot keep their check — nothing regresses.)
4. No change to `useClosedPeriodCheck` — red lock behavior stays the same.
5. No change to the `...` action menu logic beyond what it does today (still hidden when the row is locked by closed period).

## Verification after fix — same dialog (4020 Project Manager)

- 2025 bills — unchanged (green check + red lock).
- 02/03/26, 03/02/26, 03/31/26 bills — **now show green check** (paid by reconciled 02/06, 03/06, 04/11 checks).
- 05/03/26 bill — blank (paid by 05/07 check which isn't reconciled yet). Correct.
- All checks — unchanged.

And on 4045 Gas, the 03/03/26 "Monthly reimbursement for gas" bill will show its green check because the 03/20 bill payment was reconciled on the March bank rec.
