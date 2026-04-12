

## Simplify Stripe Checkout to Credit Card Only

### Problem
The current embedded Stripe checkout shows too many payment options (Link, Amazon Pay, Cash App, Klarna, Bank, Apple Pay) requiring scrolling. The user wants a clean, minimal checkout like the first screenshot — just credit/debit card fields.

### Solution
Add `payment_method_types: ['card']` to the Stripe checkout session creation in the edge function. This restricts Stripe to only show the card payment form, removing all wallets and alternative payment methods.

### Changes

**1. `supabase/functions/create-checkout-session/index.ts`**
- Add `payment_method_types: ['card']` to the `stripe.checkout.sessions.create()` call
- This single parameter change removes Apple Pay, Link, Amazon Pay, Cash App, Klarna, and Bank options
- Result: a clean checkout with just Email, Card Information, and Country fields

### Files to modify
- `supabase/functions/create-checkout-session/index.ts` (add one property)

### Files unchanged
- `src/components/SubscriptionGate.tsx` — no frontend changes needed

