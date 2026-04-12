

## Embed Stripe Checkout in PaywallDialog

### Overview
Replace the redirect-to-Stripe flow with an inline embedded checkout. The user picks a plan, then completes payment directly inside the dialog without leaving the app.

### Stripe Publishable Key
`pk_test_51TL5mD2OJCoyD632I78ZLOABNArQ3j0vjFOIDJxojGuktR4wIGPZeq5HDRlyjtPqNruAa7HDRRQWTmA6N1aKFHck00850Qmh79`

This is a public/test key and will be stored as a constant in the codebase.

### Changes

**1. Edge function: `supabase/functions/create-checkout-session/index.ts`**
- Add `ui_mode: "embedded"` to the Stripe session creation
- Replace `success_url`/`cancel_url` with `return_url` (required for embedded mode)
- Return `{ clientSecret: session.client_secret }` instead of `{ url: session.url }`

**2. Frontend: `src/components/PaywallDialog.tsx`**
- Two-step flow inside one dialog:
  - **Step 1 (Plan Selection)**: Feature list + Monthly/Annual cards with "Select" buttons
  - **Step 2 (Payment)**: Call edge function to get `clientSecret`, then render `<EmbeddedCheckoutProvider>` + `<EmbeddedCheckout>` inline
- Initialize `loadStripe()` with the publishable key
- Dialog expands to `sm:max-w-3xl` when showing the embedded form
- Add a "Back" button to return to plan selection
- On completion, Stripe handles the redirect to `return_url`

**3. Dependencies** (already installed)
- `@stripe/react-stripe-js` and `@stripe/stripe-js` are already in `package.json`

### Files to modify
- `supabase/functions/create-checkout-session/index.ts`
- `src/components/PaywallDialog.tsx`

### Files unchanged
- `SubscriptionGate.tsx` — already opens PaywallDialog correctly
- `NewProjectDialog.tsx` — already opens PaywallDialog correctly

