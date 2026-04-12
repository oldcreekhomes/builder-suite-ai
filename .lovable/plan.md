

## Replace Stripe Embedded Checkout with Custom Card Form (Stripe Elements)

### The Problem
Stripe's Embedded Checkout renders inside an iframe that we cannot customize. The duplicate header ("14 days free", "View details"), email field, field labels ("Card information", "Cardholder name", "Country or region"), and "Powered by Stripe / Terms / Privacy" footer are all baked into Stripe's iframe and cannot be removed.

### Solution
Replace the Embedded Checkout with **Stripe Elements** — specifically the `CardElement` component, which renders a single compact card input (number, expiry, CVC) that we fully control. We build our own minimal payment form with just the card input and a "Start trial" button. No email field, no labels, no branding footer.

The backend switches from creating a Checkout Session to creating a Stripe Subscription directly with a trial period. The frontend collects the card via `CardElement`, creates a PaymentMethod, and sends it to the backend to attach to the customer and start the subscription.

### Changes

**1. New Edge Function: `supabase/functions/create-subscription/index.ts`**
- Receives `{ billing_interval, payment_method_id }` from frontend
- Authenticates user, looks up profile, calculates seat count (same logic as current function)
- Creates or retrieves Stripe customer
- Attaches the payment method to the customer, sets it as default
- Creates a Stripe Subscription with `trial_period_days: 14` and the appropriate price/quantity
- Upserts the local `subscriptions` table record
- Returns success with subscription details

**2. Frontend: `src/components/SubscriptionGate.tsx`**
- Remove `EmbeddedCheckout` / `EmbeddedCheckoutProvider` imports
- Keep `loadStripe` and add `Elements`, `CardElement`, `useStripe`, `useElements` from `@stripe/react-stripe-js`
- The checkout view becomes:
  - Left column: Order summary (unchanged)
  - Right column: Custom form with just:
    - `<CardElement>` (compact single-row card input)
    - "Start trial" button
  - No email field, no labels, no branding text
- On submit: call `stripe.createPaymentMethod({ type: 'card', card })`, then invoke `create-subscription` edge function with the payment method ID
- Handle success/error states

**3. Frontend: `src/components/PaywallDialog.tsx`**
- Same pattern as SubscriptionGate — replace embedded checkout with CardElement form

**4. Keep existing `create-checkout-session` function** (no breaking changes, can remove later)

### Visual Layout

```text
┌──────────────────┐  ┌──────────────────────┐
│ Try BuilderSuite │  │                      │
│ Pro - Monthly    │  │ Payment method       │
│                  │  │ ┌──────────────────┐ │
│ 14 days free     │  │ │ 4242... MM/YY CVC│ │
│ Then $273/mo     │  │ └──────────────────┘ │
│                  │  │                      │
│ BuilderSuite Pro │  │ [  Start trial  ]    │
│ Qty 7            │  │                      │
│ Due today $0.00  │  │                      │
│ After: $273/mo   │  │                      │
└──────────────────┘  └──────────────────────┘
```

### Files
1. **New**: `supabase/functions/create-subscription/index.ts`
2. **Edit**: `src/components/SubscriptionGate.tsx` — replace embedded checkout with CardElement form
3. **Edit**: `src/components/PaywallDialog.tsx` — same replacement

