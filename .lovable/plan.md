

## Streamline: Green Subscribe → Stripe Checkout (No Dialog)

### Problem
There's an unnecessary intermediate step: Gate screen → Plan selection dialog → Stripe checkout. The user wants one click from the gate screen straight into Stripe.

### Solution
Move the Monthly/Annual choice onto the **gate screen itself** (the one with the red lock icon and green button). When the user clicks "Subscribe Monthly" or "Subscribe Annual", it calls the edge function directly and opens the embedded Stripe checkout inline — no `PaywallDialog` at all.

### Changes

**1. `src/components/SubscriptionGate.tsx`**
- Add Monthly/Annual plan cards directly on the gate screen (below the existing message)
- Each card has a green "Subscribe" button
- Clicking a button calls `create-checkout-session` with the chosen `billing_interval`
- On success, render `<EmbeddedCheckoutProvider>` + `<EmbeddedCheckout>` inline, replacing the gate content
- Import `loadStripe`, `EmbeddedCheckoutProvider`, `EmbeddedCheckout` here
- Remove the `PaywallDialog` import and usage from this component

**2. `src/components/SubscriptionBanner.tsx`**
- The banner's "Upgrade now" button still needs a way to trigger checkout
- Option: open `PaywallDialog` as before (keep it for banner use), OR replicate the same inline approach
- Simplest: keep `PaywallDialog` for the banner since it's a small prompt, not a full-screen block

**3. No edge function changes needed** — already returns `clientSecret` for embedded mode

### Result
- Gate screen shows lock icon → plan cards (Monthly $39 / Annual $33) → click → Stripe checkout appears inline
- One fewer click, no intermediate dialog
- `PaywallDialog` remains available for the banner and settings tab use cases

### Files to modify
- `src/components/SubscriptionGate.tsx` — add plan selection + embedded checkout inline
- `src/components/SubscriptionBanner.tsx` — no changes (keeps using PaywallDialog)

