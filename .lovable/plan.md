## Problem

The **Approved** bills tab is powered by the `bills-for-approval-v3` query. When you pay a single bill, the `payBill` mutation invalidates that key and the row disappears immediately. When you pay **multiple bills at once** (batch pay, as with the two Pinnacle invoices), the `payMultipleBills` mutation in `src/hooks/useBills.ts` invalidates `['bills']` but forgets `['bills-for-approval-v3']` and `['paid-bill-payment-groups']` — so the Approved list stays stale until you hit refresh.

## Fix

In `src/hooks/useBills.ts`, in the `payMultipleBills` `onSuccess` block (around lines 838–843), add the missing invalidations so the Approved and Paid tabs refresh instantly:

- `['bills-for-approval-v3']` — drives the Approved/Paid tables
- `['paid-bill-payment-groups']` — drives the consolidated Paid tab groups
- `['job-costs']`, `['job-cost-actual-details']`, `['accounts']`, `['journal-entries']` — for parity with the single-bill `payBill` mutation so downstream reports stay in sync

No UI or business-logic changes; only the cache-invalidation list is extended.