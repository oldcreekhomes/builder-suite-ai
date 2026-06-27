## Status

Great news from the logs:
- Stripe successfully reached the webhook (JWT issue is fixed).
- The signing secret is being read.
- There is one small Deno-specific bug to fix.

## The bug

Stripe's Deno build requires the async verification call. Current code uses the synchronous one and errors out with:
`SubtleCryptoProvider cannot be used in a synchronous context. Use await constructEventAsync(...)`.

## Fix

In `supabase/functions/stripe-webhook/index.ts`, change:
```
stripe.webhooks.constructEvent(body, signature, webhookSecret)
```
to:
```
await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)
```

Then redeploy `stripe-webhook`.

## After fix

Re-run the same Stripe Shell command:
```
stripe trigger invoice.payment_succeeded
```
I'll re-check the logs and confirm the event was processed successfully (no signature error, handler ran).