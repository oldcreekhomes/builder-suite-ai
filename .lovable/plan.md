# Exclude access-revoked employees from seat count

## Problem
Seat count in `create-checkout-session` (and `create-subscription`) counts every `confirmed=true` employee under the owner. Danny Sheehan has `access_revoked=true` but is still being counted, producing 8 seats instead of 7.

## Fix
Add `.eq('access_revoked', false)` to the employee count query in both edge functions, so a billed seat = confirmed AND not revoked.

### Files
1. **`supabase/functions/create-checkout-session/index.ts`** (line 55-59) — add `.eq('access_revoked', false)` to the count query.
2. **`supabase/functions/create-subscription/index.ts`** — same change to its equivalent count query.

Seat formula stays `1 (owner) + active confirmed employees`. After the fix OCH will show **7 seats** (owner + 6 active employees; Danny excluded).

`joelexc17.iworkacc@gmail.com` is still counted as active per the user's earlier note — leaving it alone unless they say otherwise.

## Verification
Reload the Subscription Required page → checkout log should print `7 seats` and Stripe quantity should be 7.
