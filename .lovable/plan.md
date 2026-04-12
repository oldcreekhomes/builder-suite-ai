

## Switch to Stripe Hosted Checkout (Redirect Mode)

### The Problem
The current embedded checkout (`ui_mode: "embedded"`) renders a tall, single-column payment form inside the app that requires scrolling. The attached screenshot shows Stripe's **hosted checkout page** — a compact two-column layout with order summary on the left and payment form on the right. This layout is only available with Stripe's redirect-based checkout (the default mode).

### Solution
Switch from embedded checkout to redirect-based checkout. Instead of rendering a Stripe iframe inside the app, users will be redirected to Stripe's hosted checkout page, which provides that compact two-column layout automatically.

### Changes

**1. Backend: `supabase/functions/create-checkout-session/index.ts`**
- Remove `ui_mode: "embedded"` 
- Replace `return_url` with `success_url` and `cancel_url`
- Return `session.url` instead of `session.client_secret`
- Keep `payment_method_types: ['card']` and `saved_payment_method_options`

**2. Frontend: `src/components/SubscriptionGate.tsx`**
- Remove `EmbeddedCheckout` / `EmbeddedCheckoutProvider` imports and rendering
- Remove `clientSecret` state and the embedded checkout view
- On plan selection, redirect to `session.url` via `window.location.href`
- Remove `@stripe/react-stripe-js` and `loadStripe` imports (no longer needed here)

**3. Frontend: `src/components/PaywallDialog.tsx`**
- Same changes: remove embedded checkout, redirect to `session.url` instead

### Result
Users click a plan, get redirected to Stripe's hosted checkout with the compact two-column layout (order summary left, card form right), then return to the app on success.

