## Why "just delete the invoices" won't work

I queried live Stripe — **no customer exists** for mgray@oldcreekhomes.com in live mode. Everything in the screenshot is being read from the **test** Stripe account because `STRIPE_SECRET_KEY` is still `sk_test_...`. The publishable keys in the browser are live, but the backend (`get-subscription-details`, `create-subscription`, etc.) still talks to test.

So:
- Voiding the 3 test invoices wouldn't change "Next billing date: May 12, 2026" — that comes from the test subscription's `current_period_end`.
- Even after voiding, the dialog would still show OCH as subscribed via the test subscription.
- Until the secret is flipped, **no live subscription can ever be created** — every signup goes into test.

## The actual fix (2 steps)

### Step 1 — Flip `STRIPE_SECRET_KEY` to live
I'll open the secret update modal. You paste your `sk_live_...` key from Stripe Dashboard → Developers → API keys (with the **Live** toggle on in the top-right of the dashboard).

After this, the app immediately stops seeing the test customer. The Manage Subscription dialog for OCH will show "No active subscription" because no live customer exists yet — which is correct.

### Step 2 — OCH subscribes once, for real
mgray@oldcreekhomes.com goes to the paywall and submits the card. This creates:
- A real live Stripe customer
- One real `$273.00` invoice today (7 × $39)
- A subscription with `current_period_end` exactly **one month from today** (~July 27, 2026)

The dialog will then show:
- Current subscription: BuilderSuite Pro – Monthly (×7), $273/mo
- Next billing date: ~July 27, 2026
- Invoice history: one entry — today's real $273

### Optional cleanup
The 3 test invoices stay parked in your **test** Stripe account forever unless you clean them. With the dashboard **Test mode** toggle on:
- Cancel the test subscription for mgray@oldcreekhomes.com
- Void the 3 test invoices

This is cosmetic — they have zero financial effect and never appear in live reports.

### Webhook secret (heads up, not blocking)
`STRIPE_WEBHOOK_SECRET` is almost certainly still the test signing secret. Live webhooks (invoice.paid, payment_failed, subscription.updated, etc.) won't verify until you create a live webhook endpoint in Stripe and update that secret too. I'll flag the exact path when we get there.

## What I need from you

Approve this plan and I'll open the `STRIPE_SECRET_KEY` update modal.
