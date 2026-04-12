

## Embed Stripe Checkout with Two-Column Layout

### The Problem
The current implementation redirects to `checkout.stripe.com` in a new tab. You want the checkout to stay within the application while matching the compact two-column layout of Stripe's hosted page (order summary left, payment form right).

### Solution
Switch back to Stripe's **Embedded Checkout** (`ui_mode: "embedded"`) and build a custom two-column layout that mirrors the hosted checkout styling: order summary panel on the left, Stripe's embedded payment form on the right.

### Changes

**1. Backend: `supabase/functions/create-checkout-session/index.ts`**
- Add `ui_mode: "embedded"` back to the session config
- Replace `success_url`/`cancel_url` with `return_url` (required for embedded mode)
- Return `clientSecret: session.client_secret` instead of `url: session.url`

**2. Frontend: `src/components/SubscriptionGate.tsx`**
- Add `@stripe/react-stripe-js` imports (`EmbeddedCheckout`, `EmbeddedCheckoutProvider`) and `loadStripe`
- After user picks a plan, fetch `clientSecret` from the edge function
- Render a two-column layout:
  - **Left column**: Order summary panel styled to match the Stripe hosted page (plan name, "14 days free" heading, pricing details, quantity, total)
  - **Right column**: `<EmbeddedCheckoutProvider>` + `<EmbeddedCheckout />` rendering the Stripe payment form
- Add a back button to return to the plan selection screen

**3. Frontend: `src/components/PaywallDialog.tsx`**
- Same pattern: fetch `clientSecret`, show two-column layout inside the dialog with order summary + embedded checkout

### Visual Layout (matching your screenshot)

```text
┌─────────────────────────────────────────────────┐
│  ← Back                                        │
│                                                 │
│  ┌──────────────────┐  ┌──────────────────────┐ │
│  │ Try BuilderSuite │  │ Enter payment details│ │
│  │ Pro - Annual     │  │                      │ │
│  │                  │  │ Email: user@...      │ │
│  │ 14 days free     │  │                      │ │
│  │ Then $2,772/yr   │  │ Card information     │ │
│  │                  │  │ [____________]       │ │
│  │ BuilderSuite Pro │  │ [MM/YY] [CVC]       │ │
│  │ Qty 7            │  │                      │ │
│  │ $2,772/yr after  │  │ Cardholder name      │ │
│  │                  │  │ [____________]       │ │
│  │                  │  │                      │ │
│  │                  │  │ [Start trial]        │ │
│  └──────────────────┘  └──────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### Files to modify
1. `supabase/functions/create-checkout-session/index.ts` — switch to embedded mode, return `clientSecret`
2. `src/components/SubscriptionGate.tsx` — two-column layout with order summary + embedded checkout
3. `src/components/PaywallDialog.tsx` — same two-column approach

### Result
Users select a plan, then see a compact two-column checkout page within the app — order summary on the left, Stripe payment form on the right — matching the Stripe hosted checkout styling exactly, without any redirect.

