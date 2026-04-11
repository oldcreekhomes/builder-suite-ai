

## Plan: Subscription System -- "2 Free Projects, Then $39/User/Month"

This is the same plan you approved earlier today, before we detoured into the domain rename. Now that buildersuiteml.com is fully migrated, we can proceed.

### Pricing Model
- **Free**: Up to 2 active projects, unlimited time
- **3rd project**: Triggers paywall with 14-day grace period
- **Monthly**: $39/user/month (owners + confirmed employees)
- **Annual**: $33/user/month ($396/user/year)
- **Seat changes**: Prorated immediately via Stripe

### Implementation Order

**Step 1: Enable Stripe**
Enable Stripe integration via Lovable. You will need to provide your **Stripe Secret Key** from [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys).

**Step 2: Database Migration**
- Create `subscriptions` table (owner_id, stripe IDs, status, billing_interval, user_count, trial_ends_at, etc.)
- Create `subscription_events` audit log table
- RLS: owners and their employees can read their company subscription

**Step 3: Edge Functions (3 new)**
- `create-checkout-session` -- creates Stripe Checkout with 14-day trial, correct seat quantity
- `stripe-webhook` -- handles invoice.paid, payment_failed, subscription.updated/deleted
- `update-subscription-seats` -- recalculates user count and updates Stripe quantity with proration

**Step 4: Frontend Hook**
- `useSubscription` -- fetches subscription state, exposes `isOnFreeTier`, `isTrialing`, `trialDaysRemaining`, `isActive`, `isPastDue`, `projectCount`

**Step 5: UI Components**
- `PaywallDialog` -- shown when creating project #3+ on free tier, offers monthly/annual options
- `SubscriptionBanner` -- persistent banner for trial countdown or past-due warnings
- Modify `NewProjectDialog` to check subscription before allowing project creation

**Step 6: Seat Auto-Sync**
- After adding/removing employees, call `update-subscription-seats` to adjust Stripe quantity with immediate proration

### Files to Create
- 1 migration file
- `supabase/functions/create-checkout-session/index.ts`
- `supabase/functions/stripe-webhook/index.ts`
- `supabase/functions/update-subscription-seats/index.ts`
- `src/hooks/useSubscription.ts`
- `src/components/PaywallDialog.tsx`
- `src/components/SubscriptionBanner.tsx`

### Files to Modify
- `src/components/NewProjectDialog.tsx`
- `src/components/employees/AddEmployeeDialog.tsx`
- `supabase/functions/delete-employee/index.ts`
- App layout (add SubscriptionBanner)

### First Action Required From You
Provide your **Stripe Secret Key** so I can enable the integration and start building.

