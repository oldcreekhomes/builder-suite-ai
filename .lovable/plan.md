
## Goal

Add two new rows to the Transaction Details dialog for Bill Payment rows so users can see partial-payment context at a glance.

## New field order (Bill Payment rows only)

Type, Date, Name, Account, Description, Invoice, **Original Bill Amount**, Current Payment, **Remaining Balance**, Cleared, Original Bill (attachments).

- **Original Bill Amount** — sum of `bills.total_amount` for the resolved bill ids (single bill for `bill_payment`; all underlying bills for `consolidated_bill_payment`).
- **Remaining Balance** — sum of `bills.total_amount − bills.amount_paid` across the same bill ids. This reflects the current open balance after all payments recorded to date (including this one). If it equals 0, the bill is fully paid; if > 0, there is still a remaining balance.

Both values formatted as currency with 2 decimals. If no bill ids resolved, show `-`.

## Technical details

File: `src/components/accounting/TransactionDetailDialog.tsx`

1. Extend the existing bill lookup (which already fetches `id, reference_number, notes` for `billIds`) to also select `total_amount` and `amount_paid`.
2. Store two new state values: `originalBillTotal: number | null`, `remainingBillBalance: number | null` (null when no bill ids).
3. In the `isBillPayment` branch of the `details` array, insert the two new rows in the order above. Use cent-precise rounding (`Math.round(v * 100) / 100`) before formatting per project standards.
4. No DB schema changes. No changes to non-bill-payment rows.
