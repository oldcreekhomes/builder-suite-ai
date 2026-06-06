## Problem

When opening the Transaction Details dialog for a **Bill Pmt - Check** row in a bank register (e.g. Atlantic Union Bank @ Longview), it always shows "No attachments found" — even when the underlying bill(s) had invoice PDFs attached.

Root cause: `TransactionDetailDialog` currently queries `bill_attachments.bill_id = transaction.source_id`. For a bill payment, `source_id` is the **bill payment id**, not a bill id, so the query returns nothing. Bill payments themselves don't have their own attachments — the invoices live on the bills they paid.

## Fix

Update `src/components/accounting/TransactionDetailDialog.tsx` so that when `source_type` is `bill_payment` or `consolidated_bill_payment`:

1. Collect the relevant bill payment id(s):
   - `bill_payment` → `[transaction.source_id]`
   - `consolidated_bill_payment` → ids from `transaction.includedBillPayments` (fallback to `source_id`)
2. Query `bill_payment_allocations` to map those payment ids to their `bill_id`s.
3. Query `bill_attachments` for all those bill ids and display them in the Attachments section.
4. Keep existing behavior for `bill`, `check`, `deposit`, `credit_card`, `manual` unchanged.
5. Clicking an attachment continues to open it through `filePreview.openBillAttachment(...)` (already wired for the bill_payment branches).

No schema changes. UI/section layout stays the same — only the data source for bill-payment attachments changes, so users can review the original invoice from a payment row and confirm whether a check is correct.