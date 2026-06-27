## Plan: Inline subscription management into Subscription page + editable billing email

### Changes

1. **`src/components/settings/SubscriptionTab.tsx`** — Rewrite to inline all `ManageSubscriptionDialog` content directly into the page (no dialog popup). Sections, in order:
   - Header (existing) + status badge
   - **Current Plan / Subscription** card: plan name, quantity (×N), price/interval, next billing date (or "Access until" if canceling), Projects/Seats tiles, "Canceling" badge if applicable
   - **Payment Method** card: shows card brand •••• last4, expiry; inline "Update" button reveals the Stripe Elements card form (with Cancel/Update Card buttons), same as today
   - **Billing Information** card: shows the billing email with an **Edit** button → inline input + Save/Cancel. Calls a new `update-billing-email` edge function
   - **Invoice History** card: same list with download receipt
   - **Auto-renew toggle** card: same switch + cancel confirmation `AlertDialog`
   - Free-tier path: keep existing "Upgrade to Pro" button + Pricing reference card

2. **Delete** `src/components/settings/ManageSubscriptionDialog.tsx` and remove its import. Move the small helpers (`getNextBillingDate`, `downloadInvoiceReceipt`, `UpdatePaymentForm`) into `SubscriptionTab.tsx` (or a colocated file).

3. **New edge function `supabase/functions/update-billing-email/index.ts`**: Authenticates the caller, looks up their Stripe customer by current email, and calls `stripe.customers.update(customerId, { email: newEmail })`. Returns success. Frontend invalidates `subscription-details` query so the new email appears.
   - Register in `supabase/config.toml` with `verify_jwt = true`.

4. **No DB schema changes**, no changes to seat-count logic, no changes to other edge functions.

### Technical notes
- Keep Stripe `Elements` provider wrapping only the card-update sub-form (unchanged behavior).
- Billing email edit only updates the Stripe customer's email (where invoices are sent). It does not change the app-login email.
- Cancel/reactivate flows, toast messages, and query invalidations stay identical to today's dialog.
