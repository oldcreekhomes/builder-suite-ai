The test signing secret is saved. Here's what I'll do next once you click "Implement plan":

## What I'll change

1. **Allow Stripe to reach the webhook**
   - Add `[functions.stripe-webhook]` with `verify_jwt = false` in `supabase/config.toml`.
   - Reason: right now Supabase rejects Stripe's request before our code ever runs — that's why there are zero logs.

2. **Handle `invoice.payment_succeeded`**
   - Update `supabase/functions/stripe-webhook/index.ts` so this event is processed instead of falling through to "Unhandled event type."

3. **Deploy the function** so the new secret + new code take effect.

## What you'll do (one click each)

After I deploy:
1. In Stripe test mode → your webhook endpoint → **Send test event**.
2. Pick **`invoice.payment_succeeded`** (I'll be watching for this one specifically).
3. Click Send.

## What I'll do after you send it

- Pull the `stripe-webhook` logs and tell you plainly: did Stripe reach it, did the signature verify, did the handler run.
- If anything failed, I fix it — you don't have to read logs or click around Stripe again.

No more Stripe-dashboard scavenger hunts. Approve this and I'll do steps 1–3.