# Make the automatic invoice email match the downloaded invoice

## Why there are two
- **Download / Send from the Subscription page** builds the BuilderSuite ML invoice (company name, billing period, PAID badge, card used).
- **The automatic monthly email** (sent when the card is charged) attaches Stripe's own PDF instead, so it looks different and leaves out the company name and card.

## What changes
- The automatic monthly email will attach the same BuilderSuite ML invoice you download, with the same layout: Bill To company and email, Date, Billing Period, Status, Paid With card, description line and Total Paid.
- The email body stays the same, along with the permanent "View invoice online" link.
- $0 adjustment invoices will not be emailed at all.
- Emails already sent stay as they are. Re-send any of them from the Subscription page to get the matching version.

## Technical details
- Add `supabase/functions/_shared/subscriptionInvoicePdf.ts` using `pdf-lib`, matching the layout and colors of `SubscriptionInvoicePdfDocument.tsx`.
- `send-subscription-invoice-email`: look up the invoice in Stripe (company name from customer/companies, card brand and last 4 from the charge, period from the first line), build the PDF with the shared helper, and attach it in place of Stripe's `invoice_pdf`. Skip the email when total and amount paid are both 0.
- Add a comment in both PDF files saying the layouts must stay identical, and a rule to `AGENTS.md`.
