

## Fix Invalid Stripe Publishable Key

### The Problem
The screenshot shows "Invalid API Key provided: pk_live_..." — the Stripe publishable key hardcoded in `SubscriptionGate.tsx` and `PaywallDialog.tsx` is invalid or belongs to a different/deactivated Stripe account.

### Solution
You need to provide the correct Stripe **publishable key** for your Stripe account. You can find it in your [Stripe Dashboard](https://dashboard.stripe.com/apikeys) under **Developers > API keys**. It starts with `pk_live_` (production) or `pk_test_` (test mode).

Once you share the correct key, I will update it in both files:
1. **`src/components/SubscriptionGate.tsx`** (line 14)
2. **`src/components/PaywallDialog.tsx`** (line 17)

### What I need from you
Please provide your correct Stripe publishable key so I can replace the invalid one. Since publishable keys are safe to store in client-side code, I'll hardcode it directly.

