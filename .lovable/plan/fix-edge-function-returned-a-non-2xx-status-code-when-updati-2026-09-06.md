# Fix "Edge Function returned a non-2xx status code" when updating the card

## What's happening

The card update failed three times this afternoon. The log message each time is:

`[UPDATE-PAYMENT-METHOD] Error: No Stripe customer found`

Stripe attaches every saved card to a customer record, so updating your card must find your billing account. The routine finds it by matching your login email against the email on file at Stripe. Your billing email was changed earlier (a supported feature), so the two no longer match — the lookup finds nothing even though your billing account exists and is active. The correct account ID (`cus_UmceJk3lIuPv3U`) is already saved in your subscription record; the routine just never uses it.

## Change

Update the card-update routine (`update-payment-method`) to use only the saved billing account ID:

1. Read the billing account ID from the subscription record for the signed-in owner. Remove the email-match lookup entirely — it was the wrong source of truth and is the cause of the failure.
2. If no saved ID exists, return a clear message ("No billing account found for this user") instead of a generic failure.
3. Surface the real error message in the update-card dialog instead of the raw "Edge Function returned a non-2xx status code" text, so any future failure is readable.

## Notes

- One backend routine + one dialog message. No database changes, no change to your subscription, card, or billing email.
- Employees on a shared account keep working, since the lookup is by subscription owner.

## Verification

Re-enter the card in Settings and save: it should succeed and set the new card as default on both the account and the active subscription.
