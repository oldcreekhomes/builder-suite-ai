## Problem

1. **Billing email doesn't update**: After Save, the page shows "Failed to load billing details" because `get-subscription-details` looks up the Stripe customer by the user's **auth email** (`mgray@oldcreekhomes.com`). Once we updated the Stripe customer's email to `ap@oldcreekhomes.com`, that lookup returns 0 results → 404 → the UI can't reload and stays stale.
2. **Misaligned columns**: Left column has 2 panels (Current Plan, Auto-renew), right column has 3 (Payment Method, Billing Information, Invoice History). Their row heights don't line up, so Auto-renew floats above Invoice History.

## Fix

### 1. `supabase/functions/get-subscription-details/index.ts`
Resolve the Stripe customer using the stored `stripe_customer_id` first, fall back to email lookup only if no row exists (mirrors what `update-billing-email` already does):

- Query `subscriptions` table by `owner_id = user.id` for `stripe_customer_id`.
- If found → `stripe.customers.retrieve(customerId)`.
- Else → existing `stripe.customers.list({ email: user.email })` path.
- Rest of the function (subscriptions, invoices, payment method) unchanged — it already uses `customer.id`.

This makes the billing email change durable: after Stripe customer email changes, we still find the same customer and the new email shows in the UI.

### 2. `src/components/settings/SubscriptionTab.tsx` — column alignment

Restructure paid-tier grid so both columns have matching row heights:

```text
┌─ Current Plan ────────────┐  ┌─ Payment Method ──────────┐
│ plan / price / next / pills│  │ card + Update            │
└────────────────────────────┘  └───────────────────────────┘
┌─ Auto-renew ──────────────┐  ┌─ Billing Information ─────┐
│ toggle row                │  │ email + Edit              │
└────────────────────────────┘  └───────────────────────────┘
┌─ Invoice History (full width, spans both columns) ──────┐
│ compact rows                                             │
└──────────────────────────────────────────────────────────┘
```

Implementation:
- Replace the two-column wrapper (`grid lg:grid-cols-2`) holding two `space-y-3` columns with a single `grid lg:grid-cols-2 gap-3` containing 4 sibling panels in this order: Current Plan, Payment Method, Auto-renew, Billing Information. CSS Grid auto-places them so row 1 = Current Plan + Payment Method, row 2 = Auto-renew + Billing Information.
- Each row uses `grid-auto-rows: minmax(0, 1fr)` (via Tailwind `auto-rows-fr`) so the two panels in a row share the same height and bottoms align.
- Move Invoice History out as a full-width panel below the grid (`col-span-full` via a separate block under the grid).
- Keep all existing panel internals (Current Plan content, Payment Method content, toggle, email edit, invoice rows) untouched — only the wrapper layout changes.

### Out of scope
- No changes to `update-billing-email`, `cancel-subscription`, `reactivate-subscription`, `create-subscription`, Stripe products/prices, or `subscriptions` table.
- No changes to free-tier upgrade UI.
- No changes to the cancel/reactivate AlertDialog.
