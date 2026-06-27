## Goal

Automatically email the Stripe invoice (PDF) to the company's billing email every time their card is charged — monthly renewals, mid-cycle proration (new user added), and the initial charge after they pass the 3-project free tier.

## Approach

Stripe already fires `invoice.payment_succeeded` for **every** successful charge — recurring renewal, proration invoice from a mid-cycle quantity change, and the first paid invoice after trial/signup. We hook into the existing `stripe-webhook` edge function and send the invoice email from there. No new triggers needed for each scenario — one event covers all three.

## Changes

### 1. `supabase/functions/stripe-webhook/index.ts`
In the existing `invoice.payment_succeeded` case (currently just flips status to `active`), additionally:
- Pull the full invoice from the event (`invoice.hosted_invoice_url`, `invoice.invoice_pdf`, `invoice.number`, `invoice.amount_paid`, `invoice.period_start/end`, `invoice.lines`).
- Resolve the recipient email: use the company's billing email from the `subscriptions` / `users` record for the owner (fallback to Stripe customer email).
- Invoke a new edge function `send-subscription-invoice-email` with the invoice metadata + recipient.
- Wrap in try/catch so a mail failure never breaks the webhook (Stripe would retry the whole event otherwise).

### 2. New edge function `supabase/functions/send-subscription-invoice-email/index.ts`
- Accepts `{ recipientEmail, invoice: { number, amountPaid, currency, periodStart, periodEnd, hostedUrl, pdfUrl } }`.
- Fetches the PDF from `invoice.invoice_pdf` (Stripe-hosted, no auth needed) and attaches it as base64 — same pattern as the existing `send-invoice-email` function the user just approved.
- Sends via Resend from `BuilderSuite ML <noreply@transactional.buildersuiteml.com>` (per `docs/email-standards.md`).
- Subject: `Your BuilderSuite ML invoice {number}`.
- Body: branded HTML with amount, billing period, link to hosted invoice, and PDF attached.

### 3. No frontend changes
The existing manual "Send" button in Invoice History stays as-is for ad-hoc resends.

## Coverage of the three scenarios

| Scenario | Stripe event that fires | Handled? |
|---|---|---|
| Monthly/annual renewal | `invoice.payment_succeeded` | Yes |
| Mid-cycle user added (proration charge) | `invoice.payment_succeeded` on the proration invoice | Yes |
| First charge after 3-project signup / trial end | `invoice.payment_succeeded` on first paid invoice | Yes |

## Out of scope

- No changes to subscription pricing, seat counting, or webhook signature handling.
- No changes to the existing manual invoice email flow.
- No retry/queue infrastructure — Stripe already retries the webhook on non-2xx, and we swallow mail errors to avoid duplicate charges-side effects.
