

## Embed Stripe Checkout in PaywallDialog

### What changes

**1. Update the edge function `create-checkout-session`**
- Add `ui_mode: "embedded"` and `return_url` (instead of `success_url`/`cancel_url`) to the Stripe session creation
- Return the `client_secret` instead of the checkout URL

**2. Install `@stripe/react-stripe-js` and `@stripe/stripe-js`**
- These provide the `EmbeddedCheckoutProvider` and `EmbeddedCheckout` React components

**3. Redesign `PaywallDialog.tsx`**
- Two-step flow inside one dialog:
  - **Step 1**: User picks Monthly ($39) or Annual ($33) — shows feature list, two plan cards with "Select" buttons
  - **Step 2**: After selecting a plan, call the edge function to get a `clientSecret`, then render `<EmbeddedCheckout>` inline in the dialog alongside the feature list
- Dialog expands to `max-w-3xl` to fit the embedded form
- User completes payment without leaving the app

**4. Update `SubscriptionGate.tsx`**
- The "Subscribe Now" button opens the redesigned PaywallDialog (no behavior change needed, just confirming it still works)

**5. Add Stripe publishable key**
- Store the Stripe publishable key (public, safe for codebase) as a constant or env var for `loadStripe()`

### Files to modify
- `supabase/functions/create-checkout-session/index.ts` — switch to embedded mode
- `src/components/PaywallDialog.tsx` — embed Stripe checkout inline
- `package.json` — add `@stripe/react-stripe-js` and `@stripe/stripe-js`

### Files unchanged
- `SubscriptionGate.tsx` — already calls PaywallDialog correctly
- `SubscriptionTab.tsx` — already calls PaywallDialog correctly

