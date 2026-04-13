

## Fix Invoice Download and In-App Payment Update

### Two Issues

1. **Invoice download opens HTML in browser** -- The current code downloads an `.html` file via blob. The user wants it to go back to using the Stripe `invoice_pdf` URL (which was the original behavior) but without the browser URL footer. Since `invoice_pdf` is a direct PDF download from Stripe, we should simply link to it. If `invoice_pdf` is available, open/download it directly. If not, fall back to the HTML receipt.

2. **"Update" button redirects to billing.stripe.com** -- Currently calls the `customer-portal` edge function which opens Stripe's external portal. Instead, we need an in-app dialog with Stripe Elements (matching the existing checkout pattern in `SubscriptionGate.tsx` and `PaywallDialog.tsx`) that collects a new card and updates the payment method via a new edge function.

### Changes

**1. Fix invoice download** (`ManageSubscriptionDialog.tsx`)
- Change the download button: if `inv.invoice_pdf` exists, open it directly (it's a Stripe-hosted PDF -- no browser footer). If not, fall back to the HTML receipt generator.
- This restores the original behavior of downloading/viewing the actual Stripe PDF.

**2. Create `update-payment-method` edge function** (`supabase/functions/update-payment-method/index.ts`)
- Accepts `{ payment_method_id }` in the request body
- Authenticates the user, finds their Stripe customer
- Detaches old default payment method (optional)
- Attaches new payment method and sets it as default on the customer + subscription
- Returns success

**3. Add in-app Update Payment dialog** (`ManageSubscriptionDialog.tsx`)
- Add a nested dialog/modal that appears when "Update" is clicked
- Uses `loadStripe` + `Elements` + `CardNumberElement`/`CardExpiryElement`/`CardCvcElement` (same pattern as `SubscriptionGate.tsx`)
- On submit: creates a PaymentMethod via Stripe.js, then calls the new `update-payment-method` edge function
- On success: closes dialog, invalidates query cache to refresh payment method display
- Reuses the same Stripe publishable key already in the project

### Files to create
1. `supabase/functions/update-payment-method/index.ts` -- new edge function

### Files to modify
1. `src/components/settings/ManageSubscriptionDialog.tsx` -- fix invoice download + add in-app card update dialog

