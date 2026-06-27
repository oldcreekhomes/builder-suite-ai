## Go Live with Stripe

Swap the two Stripe secrets from test → live values.

### Steps
1. Open secure form to update **`STRIPE_SECRET_KEY`** → paste your `sk_live_...` key.
2. Open secure form to update **`STRIPE_WEBHOOK_SECRET`** → paste the `whsec_...` from your **live-mode** webhook endpoint.
3. Edge functions (`stripe-webhook`, `create-checkout`, `check-subscription`, `customer-portal`) pick up new values automatically — no redeploy needed.
4. Verify: run a real checkout with a real card (small amount), confirm subscription row created and live webhook delivery shows `200` in Stripe Dashboard.

### Notes
- Confirm the signing secret is from the **live** endpoint, not test — they differ.
- Real cards will be charged from this point on.
