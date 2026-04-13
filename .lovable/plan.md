
Fix Invoice Download Regression

Do I know what the issue is? Yes.

Exact problem:
- In `src/components/settings/ManageSubscriptionDialog.tsx`, `downloadInvoiceReceipt()` now immediately opens `invoice.invoice_pdf` with `window.open(...)`.
- That `invoice_pdf` is a Stripe-hosted `pay.stripe.com` URL, so the app sends the user back to Stripe instead of generating an in-app receipt.
- Earlier HTML/print attempts added the Lovable URL because browser print headers/footers are browser-controlled and cannot be reliably removed with CSS.
- So the correct fix is neither Stripe-hosted PDFs nor printable HTML. It must be a locally generated PDF blob downloaded directly in the app.

Plan
1. Replace the current invoice download logic in `ManageSubscriptionDialog.tsx`
- Remove the `invoice.invoice_pdf` → `window.open(...)` branch.
- Remove the HTML receipt fallback.
- Keep the same invoice row button, but make it generate a local PDF and download `Invoice_<id>.pdf`.

2. Generate a real in-app PDF
- Add a small PDF document component using `@react-pdf/renderer` styled like the earlier simple receipt:
  - BuilderSuite title in black
  - Invoice number
  - Invoice date
  - Billing email
  - Status
  - Description
  - Total paid
- No iframe, no browser print dialog, no Stripe redirect, no URL footer.

3. Use the project’s existing download pattern
- Follow the same blob download approach already used in `BudgetTable`, `AccountsPayableContent`, and `CheckPrintPreview`:
  - `pdf(<... />).toBlob()`
  - `URL.createObjectURL(blob)`
  - temporary `<a download>` click
- This keeps the experience inside the app and produces a normal PDF file.

4. Keep scope tight
- No Supabase/database changes.
- No edge function changes.
- No changes to the payment-method update flow in this pass unless requested separately.

Files to modify
- `src/components/settings/ManageSubscriptionDialog.tsx`
  - replace `downloadInvoiceReceipt()` implementation
  - wire invoice buttons to the new local PDF generator
- `src/components/settings/pdf/SubscriptionInvoicePdfDocument.tsx` (new)
  - one-page receipt PDF component following existing `@react-pdf/renderer` conventions used elsewhere in the project

Technical details
- I will stop using `invoice.invoice_pdf` on the frontend for downloads.
- I will not use HTML-to-print or `window.print()` because that is what introduces uncontrollable browser footers/URLs.
- The downloaded file will be a true PDF generated from the invoice data already returned by `get-subscription-details`.
- This is the reliable way to give you the same simple receipt experience without any Stripe URL or Lovable URL showing on the document.
