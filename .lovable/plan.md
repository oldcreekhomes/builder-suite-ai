## What's actually wrong

The Manage Subscription dialog reads everything live from Stripe via `STRIPE_SECRET_KEY`. You confirmed live Stripe has **no customer** for mgray@oldcreekhomes.com, yet the dialog shows 3 paid invoices and an active subscription. The only explanation: `STRIPE_SECRET_KEY` in Supabase Edge Function secrets is still a **test** key, despite the publishable keys being live.

I cannot read the secret value to confirm directly (Supabase encrypts it). So step 1 is a diagnostic that tells us for sure, in 30 seconds.

## Plan

### Step 1 — Add a one-line diagnostic to `get-subscription-details`
Add a `console.log` that prints `stripeKey.startsWith("sk_live") ? "LIVE" : "TEST"` plus `stripeKey.slice(0, 8)` (just the prefix, never the full value). Deploy. You then open Manage Subscription once, and we check Edge Function logs.

**If logs say TEST** → the saved secret is wrong. I open the update modal, you paste the real `sk_live_...` key (Stripe Dashboard → toggle "Test mode" OFF in the top-right → Developers → API keys → reveal Secret key). Same for `STRIPE_WEBHOOK_SECRET` (new live webhook endpoint → copy `whsec_...`).

**If logs say LIVE** → the secret is fine and something else is wrong (cached row, wrong account, etc.). I'll dig from there.

### Step 2 — Clean up the orphan local `subscriptions` row
Even after the key is flipped, the local `public.subscriptions` table may still have a row for OCH's owner_id pointing at the old test customer/subscription. That would let the app think they're still subscribed without ever charging the live card. Delete that row so OCH hits the paywall cleanly and creates a fresh live subscription. I'll write a migration to delete the row for OCH's `owner_id`.

### Step 3 — Fix the "Next billing date" source
Stripe API `2025-08-27.basil` moved `current_period_end` off the Subscription object onto subscription items. `get-subscription-details` reads `sub.current_period_end` which is now often null on live subs, so the fallback (`period_start + 30 days`) is what produces "May 12, 2026". Change it to prefer `sub.items.data[0].current_period_end` first, then `sub.current_period_end`, then the fallback. After OCH subscribes for real, the dialog will correctly show **one month from today**.

### Step 4 — Remove the diagnostic log
Once we've confirmed the key, strip the `console.log` from step 1.

### Step 5 — OCH subscribes for real
mgray@oldcreekhomes.com hits the paywall, submits the card. One real $273 charge today, next bill ~July 27, 2026, invoice history shows exactly one entry.

### Optional cleanup in Stripe Dashboard
Switch the dashboard to **Test mode**, cancel the test subscription for mgray@oldcreekhomes.com, void the 3 test invoices. Cosmetic only — they never touched real money.

## Files touched

- `supabase/functions/get-subscription-details/index.ts` — add diagnostic log (step 1), fix `current_period_end` source (step 3), remove diagnostic (step 4)
- New migration — delete `public.subscriptions` row for OCH's owner_id (step 2)

No frontend changes.
