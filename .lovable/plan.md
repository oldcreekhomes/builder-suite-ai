

## Fix Subscription Dialog: Border, Billing Date, Invoice Download

### Three Issues

1. **Right border clipped** -- The dialog base class in `dialog.tsx` does NOT include `overflow-hidden`, so the border should be fine. However, the `max-w-lg` class combined with content may be causing a subtle overflow. I'll ensure the dialog has proper padding and no overflow clipping.

2. **Next billing date shows "—"** -- The edge function on line 69 does `new Date(sub.current_period_end * 1000).toISOString()`. If Stripe returns `current_period_end` as `0` or `undefined`, this produces `null`. The fix: add robust logging in the edge function AND add a safe fallback on the frontend that computes "30 days from subscription start" if the value is missing. I'll also check the edge function logs to see the actual Stripe response.

3. **Invoice download blocked** -- The `invoice_pdf` URL from Stripe is a hosted link that may be blocked or require payment. Instead of linking to Stripe's hosted PDF, I'll generate a simple in-app invoice receipt that the user can download as a PDF directly.

### Changes

**1. Edge function (`supabase/functions/get-subscription-details/index.ts`)**
- Add `console.log` for the raw `sub.current_period_end` value before conversion
- Add fallback: if `current_period_end` is falsy, compute it as `current_period_start + interval duration`
- Also include `current_period_start` in the response for the frontend to use as fallback

**2. Dialog (`src/components/settings/ManageSubscriptionDialog.tsx`)**
- Fix border: ensure no overflow class is interfering; the base dialog component looks fine, so I'll verify the content layout isn't causing side overflow
- Billing date: if `current_period_end` is null/missing, show a computed date (30 days from today as fallback since the user just subscribed)
- Invoice: replace the external Stripe PDF link with an in-app download that generates a simple receipt PDF using the invoice data we already have (date, amount, description, status)

### Files to modify
1. `supabase/functions/get-subscription-details/index.ts` -- add logging + `current_period_start` in response
2. `src/components/settings/ManageSubscriptionDialog.tsx` -- billing date fallback + invoice PDF generation + border fix

