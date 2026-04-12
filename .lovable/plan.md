

## Store the Webhook Signing Secret

### What
Save your Stripe webhook signing secret (`whsec_XqBscXFbTQL2enJK4mDEVwOuI8FQtYkm`) as a secure environment variable so the `stripe-webhook` edge function can verify incoming Stripe requests are authentic.

### Steps
1. **Add the secret** `STRIPE_WEBHOOK_SECRET` with value `whsec_XqBscXFbTQL2enJK4mDEVwOuI8FQtYkm` to your Supabase edge function secrets
2. **Verify** by redeploying the `stripe-webhook` function (it already references this secret in its code)

That's the only remaining setup step. Once stored, your webhook is secured and the full subscription flow is ready to test end-to-end.

