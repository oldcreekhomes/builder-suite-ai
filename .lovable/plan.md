

## Replace External Stripe Portal with In-App Subscription Management Dialog

### Summary
Replace the "Manage Subscription" button (which opens Stripe's external Customer Portal) with a dialog that shows all the same information inline: current subscription details, payment method, billing info, invoice history, and a cancel option.

### New Edge Function: `get-subscription-details`
Fetches from Stripe API:
- Active subscription info (plan name, quantity, amount, interval, next billing date)
- Default payment method (card brand, last 4, expiry)
- Customer billing email
- Recent invoices (date, amount, status, PDF link)

Returns all this as JSON to the frontend.

### New Edge Function: `cancel-subscription`
Cancels the Stripe subscription (at period end by default), updates the local `subscriptions` table status to `canceled`.

### New Component: `ManageSubscriptionDialog`
A dialog matching the Stripe portal layout from the screenshot:
- **Current Subscription** section: Plan name (×quantity), total per month, next billing date
- **Payment Method** section: Card brand icon, last 4 digits, expiry, "Default" badge
- **Billing Information** section: Email address
- **Invoice History** section: Table with date, amount, status badge, plan name
- **Cancel Subscription** button (with confirmation dialog)

### Changes to `SubscriptionTab.tsx`
- Replace `handleManageSubscription` (which opens external portal) with dialog state toggle
- Add `<ManageSubscriptionDialog>` component
- Keep the `customer-portal` edge function as fallback (no deletion)

### Files
1. **New**: `supabase/functions/get-subscription-details/index.ts`
2. **New**: `supabase/functions/cancel-subscription/index.ts`
3. **New**: `src/components/settings/ManageSubscriptionDialog.tsx`
4. **Edit**: `src/components/settings/SubscriptionTab.tsx` — swap external link for dialog

### Dialog Layout
```text
┌─────────────────────────────────────────────────┐
│  Manage Subscription                        [X] │
│─────────────────────────────────────────────────│
│  CURRENT SUBSCRIPTION                           │
│  BuilderSuite Pro - Monthly (×7)                │
│  $273.00 per month                              │
│  Next billing date: May 12, 2026                │
│─────────────────────────────────────────────────│
│  PAYMENT METHOD                                 │
│  🔵 Visa •••• 4242   Expires 02/2028  [Default] │
│─────────────────────────────────────────────────│
│  BILLING INFORMATION                            │
│  Email: mgray@oldcreekhomes.com                 │
│─────────────────────────────────────────────────│
│  INVOICE HISTORY                                │
│  Apr 12, 2026  $273.00  [Paid]  BSPro-Monthly   │
│─────────────────────────────────────────────────│
│                        [Cancel Subscription]    │
└─────────────────────────────────────────────────┘
```

