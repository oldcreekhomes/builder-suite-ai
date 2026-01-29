
Goal: ✅ COMPLETED
- Restored "combined payment" behavior in the Bank Account register (Account Detail dialog) so a single real-world bank-clearing payment shows as one line with a "+N" indicator and a hover tooltip that lists the included items.

Implementation Summary
- Extended the Transaction interface with `includedBillPayments` and `consolidatedTotalAmount` fields
- Added fetching of `bill_payments` and `bill_payment_allocations` tables within the queryFn
- Suppressed legacy bill_payment journal entry lines that belong to consolidated payments
- Created synthetic `consolidated_bill_payment` rows for each `bill_payments` record
- Added "+N" indicator with hover tooltip on the Account column showing breakdown of included bills
- Made consolidated payment rows read-only (no inline editing, no delete button)
- Updated type label to show "Bill Pmt - Check" for consolidated payments

Files Changed
- src/components/accounting/AccountDetailDialog.tsx
