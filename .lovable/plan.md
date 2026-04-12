

## Fix: Remove "Pay with Link" and "Save my info" from Stripe Checkout

### The Problem
Even though `payment_method_types: ['card']` is set, Stripe's Embedded Checkout still shows "Pay with Link" and "Save my information for 1-click checkout." These are controlled by separate settings, not by `payment_method_types`.

### Solution (Two Parts)

**Part 1: Code change — Disable saved payment method options**
In `supabase/functions/create-checkout-session/index.ts`, add `saved_payment_method_options` to the checkout session to disable saving:

```typescript
saved_payment_method_options: {
  payment_method_save: 'disabled',
},
```

This removes the "Save my information for faster checkout" checkbox.

**Part 2: Stripe Dashboard — Disable Link**
"Pay with Link" is a Stripe Dashboard setting that cannot be disabled via API. You need to:
1. Go to your [Stripe Dashboard → Settings → Payment Methods](https://dashboard.stripe.com/settings/payment_methods)
2. Find **Link** and toggle it **off**
3. Wait a few minutes for it to take effect

### Files to modify
- `supabase/functions/create-checkout-session/index.ts` — add `saved_payment_method_options`

### Result
After both changes, the checkout will show only: Email, Card number, Expiry, CVC, and Country — matching the clean layout from your first screenshot.

