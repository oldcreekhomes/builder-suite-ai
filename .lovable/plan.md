## Keep users in-app for subscription/payment management

Two problems found:

1. **Stripe Customer Portal redirect**: `SubscriptionGate.tsx` "Update Payment Method" button (shown when company is locked out for `past_due` / `unpaid` / `canceled`) calls the `customer-portal` edge function and redirects the user to `billing.stripe.com`. This is what's shown in the screenshot.
2. **Stale test publishable keys**: `SubscriptionGate.tsx` and `ManageSubscriptionDialog.tsx` still use `pk_test_...`. Only `PaywallDialog.tsx` was switched to `pk_live_...` earlier.

### Changes

**`src/components/SubscriptionGate.tsx`**
- Remove `openBillingPortal()` and the `customer-portal` invoke.
- On the lockout screen, change "Update Payment Method" to open the existing in-app `ManageSubscriptionDialog` (which already supports updating the card via Stripe Elements inside the app via `update-payment-method` edge function). Import + render `<ManageSubscriptionDialog open={...} onOpenChange={...} />`.
- Swap `pk_test_...` → `pk_live_51TL5lp2M261MnJZCV9lA2C13cHAdkFVfuFZAWjQN7vLFmmikKEXhV5d8JNghePa3nNwUWfuuFiULGOhnM3cXyLY2002fDEt9S4`.

**`src/components/settings/ManageSubscriptionDialog.tsx`**
- Swap `pk_test_...` → `pk_live_...` (same live key).

### Out of scope
- Leave the `customer-portal` edge function in place (no callers after this change; safe to leave for now or delete later).
- No other UI changes — the existing in-app `ManageSubscriptionDialog` already handles plan, card update, billing email, invoices, cancel/reactivate natively.
