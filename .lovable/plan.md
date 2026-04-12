

## Store STRIPE_WEBHOOK_SECRET

### What
Save your webhook signing secret as a secure environment variable so the `stripe-webhook` edge function can verify incoming Stripe requests.

### Step
1. **Add secret** `STRIPE_WEBHOOK_SECRET` with value `whsec_XqBscXFbTQL2enJK4mDEVwOuI8FQtYkm` using the secrets tool
2. **Redeploy** the `stripe-webhook` edge function to pick up the new secret

The edge function code already references this secret — no code changes needed.

