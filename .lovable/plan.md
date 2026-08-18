# Split the grouped 126 Longview payments into single payments

## What's wrong
Two of the 06/05/2026 Capital One payments were recorded as one consolidated payment covering several bills, so Manage Bills shows a grouped parent row:

- Green Landscaping, Inc. — one $6,807.25 payment covering 4 bills (MSG584 $568.00, 06052026-Longview-A $2,719.00, -B $3,015.25, -C $505.00)
- Raymond Zins — one $333.34 payment covering 2 bills ($166.67 + $166.67)

Every other 06/05 payment (An Exterior, Floor & Decor, LCS Roll-off, Home Depot, Torres Moreno, Washington Gas) is already one payment per bill.

## Fix
Split those two into one payment per bill: 6 individual payments replacing the 2 grouped ones. Each keeps the same vendor, Capital One account, 06/05/2026 date, project 126 Longview, and its own bill amount. The bills stay Paid with the same amounts — only the payment grouping changes, so Manage Bills lists each as its own single payment row instead of an expandable group.

## Technical notes
- The accounting side is already per bill: each of these bills has its own `bill_payment` journal entry (debit A/P, credit Capital One) keyed to the bill, not to the consolidated payment. Nothing in the general ledger, the bank register total, or the balance sheet changes.
- Work is limited to `bill_payments` / `bill_payment_allocations`: insert one `bill_payments` row per bill (same owner, vendor, project, payment_account, payment_date, total = bill amount), repoint each allocation to its new payment, then delete the two now-empty consolidated payment rows. Neither payment is reconciled, so no reconciliation links need rework.
- No code changes.
