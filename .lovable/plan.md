

## Fix: Old Creek Homes (and all users) must actually pay

### Root Cause
Old Creek Homes has a subscription record in the database with `status: 'trialing'` but **no Stripe customer or subscription ID**. This means they never went through Stripe checkout — it's a phantom trial record. The `SubscriptionGate` sees `isTrialing = true` and lets them through.

### Fix (2 parts)

**1. Tighten the subscription validation in `useSubscription.ts`**
- A subscription should only be considered valid (trialing or active) if it has a `stripe_subscription_id`. Without one, the record is meaningless.
- Update the logic: `isTrialing` and `isActive` should also require `stripe_subscription_id` to be non-null.
- This ensures phantom/manual records don't bypass the gate.

**2. Delete or reset the bogus subscription record**
- Delete the existing Old Creek Homes subscription row (no Stripe IDs, not a real subscription) so the gate properly blocks them.
- Alternatively, the code fix alone will handle it since the record has no `stripe_subscription_id`.

### Code change in `src/hooks/useSubscription.ts`
- Add a check: `const hasStripeSubscription = !!subscription?.stripe_subscription_id;`
- Change derived flags:
  - `isTrialing = status === "trialing" && hasStripeSubscription`
  - `isActive = status === "active" && hasStripeSubscription`
- `needsSubscription` will then correctly be `true` for Old Creek Homes since they have no real Stripe subscription.

### Result
Old Creek Homes (and any other account with a fake subscription record) will be blocked by the full-screen paywall until they complete a real Stripe checkout. Settings page remains accessible so they can subscribe.

### Files modified
- `src/hooks/useSubscription.ts` — add `stripe_subscription_id` validation

