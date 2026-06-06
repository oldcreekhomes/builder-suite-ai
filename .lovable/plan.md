
## Goal

Make the Transaction Details dialog easier to read for Bill Payment rows (`Bill Pmt - Check`, consolidated bill payments) by replacing accounting jargon with plain-language fields sourced from the original bill.

Scope: changes apply only when `source_type` is `bill_payment` or `consolidated_bill_payment`. All other transaction types keep the existing Debit / Credit / Amount / Balance layout.

## Field changes (Bill Payment rows only)

| Current | New |
|---|---|
| Description: `-` | Description: pulled from the original bill's description (bill memo/description). If consolidated and multiple bills, join with `; ` or show first + "(+N more)". |
| Debit | removed |
| Credit | removed |
| Amount | **Current Payment** — the payment amount applied (positive currency, no parentheses) |
| Balance | removed entirely |

Final field order for bill payments:
Type, Date, Name, Account, Description, Invoice, Current Payment, Cleared, Original Bill (attachments).

A new **Invoice** row is inserted (replacing Debit/Credit) showing the original bill's invoice/reference number. For consolidated payments with multiple bills, list each invoice number separated by `, ` (e.g., `INV-1023, INV-1024`).

## Technical details

File: `src/components/accounting/TransactionDetailDialog.tsx`

1. Extend the existing bill-lookup effect (the one that already resolves `billIds` for the Original Bill section) to also fetch `bills.description` and `bills.reference_number` (invoice #) for those bill ids. Store in state: `originalBillDescription: string | null`, `originalInvoiceNumbers: string[]`.

2. In the `details` array builder, branch on `isBillPayment`:
   - If true, build a different list:
     - `Description`: `originalBillDescription || transaction.description || '-'` (keep `isDescription: true` so edit menu still works, but consider hiding the edit affordance for bill payments since the source is the bill).
     - `Invoice`: comma-joined `originalInvoiceNumbers`, or `-`.
     - `Current Payment`: `formatCurrency(Math.abs(netAmount))` — no parentheses.
     - `Cleared`: unchanged.
   - Skip `Debit`, `Credit`, `Balance` entirely.
   - If false, keep current details array as-is.

3. No DB schema changes. No changes to other dialogs or registers.

## Out of scope

- Field changes for non-bill-payment rows (JEs, deposits, checks, bills, credit card charges).
- Editing the bill's description from this dialog.
