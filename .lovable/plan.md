

## Add Cancel/Reactivate Toggle Switch

### Current Problem
Once a subscription is set to cancel at period end, there is no way to undo it. The "Cancel Subscription" button simply disappears when `cancel_at_period_end` is true.

### Solution
Replace the "Cancel Subscription" button with a toggle switch that shows the subscription's active/canceling state. Flipping the toggle off triggers cancellation (with confirmation dialog); flipping it back on reactivates the subscription.

### Changes

**1. Create `reactivate-subscription` edge function** (`supabase/functions/reactivate-subscription/index.ts`)
- Accepts `{ subscription_id }`, authenticates the user, verifies ownership
- Calls `stripe.subscriptions.update(id, { cancel_at_period_end: false })` to undo the pending cancellation
- Updates local `subscriptions` table status back to `"active"`

**2. Update `ManageSubscriptionDialog.tsx`**
- Remove the conditional that hides the cancel section when `cancel_at_period_end` is true
- Replace the "Cancel Subscription" button with a labeled Switch toggle:
  - Label: "Auto-renew subscription"
  - ON = subscription will renew (active state)
  - OFF = subscription set to cancel at period end (canceling state)
- When toggled OFF: show the existing confirmation dialog, then call `cancel-subscription`
- When toggled ON: call the new `reactivate-subscription` edge function, show a success toast
- Show helper text below: "Your subscription will cancel on [date]" when toggled off, or "Your subscription will automatically renew" when on

### Files to create
1. `supabase/functions/reactivate-subscription/index.ts`

### Files to modify
1. `src/components/settings/ManageSubscriptionDialog.tsx` -- replace cancel button with toggle, add reactivate handler

