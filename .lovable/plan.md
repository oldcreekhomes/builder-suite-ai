

## Store Stripe Webhook Signing Secret

### What we're doing
Saving the webhook signing secret (`whsec_XqBscXFbTQL2enJK4mDEVwOuI8FQtYkm`) as a secure environment variable in Supabase so the `stripe-webhook` edge function can verify that incoming requests are genuinely from Stripe.

### Steps
1. **Add the secret** `STRIPE_WEBHOOK_SECRET` to Supabase edge function secrets using the secrets tool
2. **Verify** the `stripe-webhook` edge function already references `STRIPE_WEBHOOK_SECRET` (it does — confirmed in the code)

That's it — once the secret is stored, the webhook is fully secured and production-ready.

