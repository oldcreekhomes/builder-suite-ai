## Why your change didn't show up

The dialog in your screenshot ("4045 - Gas") is **`src/components/reports/JobCostActualDialog.tsx`** — a different file from the AccountDetailDialog I edited. Both render similar-looking tables, but the Job Cost report opens this one. I missed it.

The good news: the fix is a near-identical copy of what we just did, plus the same payment-derived `reconciled` logic that this dialog is currently missing entirely (it only reads `bills.reconciled`, never looks at the paying check). That's why your `Monthly reimbursement for gas` bill shows nothing — its `bills.reconciled` flag is false, and this dialog never checks the 03/20 reconciled bill_payment that paid it.

## What I'll change in `JobCostActualDialog.tsx`

### Data layer (lines ~155–282)
1. Also select `status` from `bills` (and keep `reconciled`).
2. For every bill, fetch its `bill_payment_allocations` → `bill_payments` and compute `derivedReconciled = fully paid (cent-precise) AND every payment reconciled` — same algorithm we used in AccountDetailDialog.
3. Add a derived `status: 'pending' | 'approved' | 'cleared'` per row:
   - **Bill**: `status === 'draft'` → pending; `bill.reconciled || derivedReconciled` → cleared; else approved.
   - **Check / Deposit / JE**: own `reconciled` → cleared; else approved.

### UI layer (lines ~442, 493–497, 500–525)
1. Rename header **"Cleared" → "Status"**, widen `w-[5%]` → `w-[8%]`.
2. Replace the green-check-only cell with the same 3-state pill badge used in AccountDetailDialog (amber Pending / blue Approved / green Cleared with check icon).
3. **Decouple lock from reconciled**: lock now only fires on `isDateLocked(line.journal_entries.entry_date)`. The `Reconciled / Reconciled and Books Closed` tooltips collapse to just `Books Closed`.
4. Actions menu visibility logic unchanged otherwise.

### No DB changes
Same data sources as AccountDetailDialog — `bills.status`, `bill_payment_allocations`, `bill_payments.reconciled` all exist.

## Verification — same 4045 Gas dialog after fix

- 03/03 Check "January and February gas" — 🟢 Cleared + 🔒 lock if March is closed.
- 03/03 Bill "Monthly reimbursement for gas" — **🟢 Cleared** (paid by reconciled 03/20 bill_payment). Lock only if period closed.
- 05/01 and 06/01 Car Allowance bills — 🔵 Approved (entered, no reconciled payment yet). `...` menu available.

## Memory
Update the existing `mem://accounting/account-detail-status-model` note to say the 3-state model also applies to `JobCostActualDialog`, so the next change touches both files.
