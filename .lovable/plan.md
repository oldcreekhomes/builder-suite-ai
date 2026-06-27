# Fix "No such price" error in live mode

## Problem
The Stripe secret key is now in **live** mode, but the hardcoded price IDs in the edge functions (`price_1TL7DM2OJCoyD632UplhQm6q` monthly, `price_1TL7Df2OJCoyD632Ap6Jx4ZE` annual) were created in **sandbox/test** mode. Live Stripe has no record of them, so checkout fails with `No such price`.

## Fix

1. **Create a new live Stripe product + price** via the Stripe tool:
   - Product: `BuilderSuite ML Subscription`
   - Price: `$39.00 USD`, recurring monthly
   - This will run against the live Stripe account and return a new live `price_...` ID.

2. **Update `supabase/functions/create-checkout-session/index.ts`**
   - Replace `monthly` price ID in the `PRICES` map with the new live price ID.
   - Leave `annual` as-is (unused since the annual plan was removed).

3. **Update `supabase/functions/create-subscription/index.ts`**
   - Same replacement: `monthly` → new live price ID.

No frontend changes. No DB changes. No other files touched.

## Verification
After deploy, click **Subscribe** on the lockout page as OCH — checkout should redirect to Stripe instead of throwing.
