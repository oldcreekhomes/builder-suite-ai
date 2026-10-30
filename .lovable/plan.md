# Make "View invoice online" links in emails never expire

## The short answer
Stripe's own invoice pages always expire, and Stripe has no setting to turn that off. So that exact link can't be made permanent.

What we can do: put our own permanent link in the email. When someone clicks it, it asks Stripe for a fresh invoice page right then and opens it. The link in the email never changes, but it always lands on a working Stripe page.

## What changes
- The monthly receipt email (sent automatically after each payment) and the "Email Invoice" button on the Subscription page both use the new permanent "View invoice online" link.
- Clicking the link opens the live Stripe invoice page, the same page you see today, just never expired.
- If Stripe ever can't give a page back, the link shows a simple BuilderSuite ML receipt page instead of an error.
- Emails already sent keep their old Stripe link, which stays expired. Re-send any invoice from the Subscription page to get a permanent link.

## Security
- Each link carries a hard-to-guess code tied to one invoice, so nobody can guess other invoices.
- The link only shows that one invoice. It doesn't sign anyone in and shows no other account data.

## Technical details
- New public edge function `invoice-link` (verify_jwt = false): `GET ?id=<invoice_id>&sig=<hmac>`. Checks an HMAC-SHA256 of the invoice ID, signed with a new `INVOICE_LINK_SECRET` (generated, server-only). Then calls `stripe.invoices.retrieve`, which returns a fresh `hosted_invoice_url`, and sends a 302 redirect to it. If that fails, it shows a minimal HTML receipt.
- Shared helper `buildInvoiceLink(invoiceId)` used by `stripe-webhook` (line ~178) and `send-subscription-invoice-email` (line 108) in place of the raw `hosted_invoice_url`.
- `SubscriptionTab` send flow passes the invoice ID so the email function can build the link.
- No database changes.
