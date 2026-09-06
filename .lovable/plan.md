# Fix "Edge Function returned a non-2xx status code" when updating the card

## What's happening

The card update failed three times this afternoon. The log message each time is:

`[UPDATE-PAYMENT-METHOD] Error: No Stripe customer found`

The card update routine looks up the billing account by matching your login email against the email on file at Stripe. Your billing email was changed earlier (that's a supported feature), so those two no longer match and the lookup finds nothing — even though the billing account exists and is active (`cus_UmceJk3lIuPv3U`).

The billing-email routine already handles this correctly: it uses the billing account ID saved in the subscription record and only falls back to the email match. The card routine was never updated the same way.

## Change

Update the card-update routine to find the billing account the same way the billing-email routine does:

1. Read the saved billing account ID from the subscription record for the signed-in owner.
2. Only if none is saved, fall back to matching by login email.
3. If neither finds an account, return a clear message ("No billing account found for this user") instead of a generic failure.

Also surface the real message in the dialog instead of the raw "Edge Function returned a non-2xx status code" text, so any future failure is readable.

## Notes

- Backend routine + one dialog message. No database changes, no change to your subscription, card, or billing email.
- Employees on a shared account keep working as before, since the lookup is by subscription owner.

## Verification

Re-enter the card in Settings and save: it should succeed and set the new card as default on both the account and the active subscription.
