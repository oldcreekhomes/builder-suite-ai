

## Plan: Subscription System -- "2 Free Projects, Then $39/User/Month"

### Pricing Summary
- **Free**: Up to 2 active projects, full platform access, unlimited time
- **3rd project**: Triggers paywall with 14-day grace period to add payment
- **Monthly**: $39/user/month (all users: owners + employees)
- **Annual**: $33/user/month (paid in full, $396/user/year)
- **Seat changes**: Prorated immediately via Stripe's built-in proration

---

### Step 1: Enable Stripe Integration

Enable Stripe using the Lovable Stripe tool. You will need to provide your Stripe secret key (from your Stripe Dashboard under Developers > API Keys).

### Step 2: Database Migration

Create a `subscriptions` table to track each home builder's billing state:

```sql
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  stripe_customer_id text,
  stripe_subscription_id text,
  billing_interval text NOT NULL DEFAULT 'monthly',  -- 'monthly' or 'annual'
  status text NOT NULL DEFAULT 'free',  -- free, trialing, active, past_due, canceled
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  user_count integer DEFAULT 0,
  price_per_user_cents integer DEFAULT 3900,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Owner and their employees can read subscription
CREATE POLICY "Users can view own company subscription"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR owner_id = (SELECT home_builder_id FROM public.users WHERE id = auth.uid())
  );

-- Audit log
CREATE TABLE public.subscription_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.users(id),
  event_type text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view own events"
  ON public.subscription_events FOR SELECT TO authenticated
  USING (owner_id = auth.uid());
```

### Step 3: Edge Functions (2 new)

**`create-checkout-session`**
- Accepts: `owner_id`, `billing_interval` (monthly/annual)
- Counts all users in the company (owner + employees where `confirmed = true`)
- Creates a Stripe Customer (or reuses existing), creates a Subscription with `trial_period_days: 14` and `quantity` = user count
- Returns the Stripe Checkout URL
- Uses price: $39/user/month or $396/user/year

**`stripe-webhook`**
- Handles: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`
- Updates `subscriptions` table status accordingly
- Logs events to `subscription_events`

### Step 4: New Hook -- `useSubscription`

**File**: `src/hooks/useSubscription.ts`

- Fetches the company's `subscriptions` row (resolves `owner_id` for employees)
- Counts the company's active projects
- Exposes: `isOnFreeTier`, `isTrialing`, `trialDaysRemaining`, `isActive`, `isPastDue`, `projectCount`, `userCount`, `billingInterval`
- Used by NewProjectDialog and banner components

### Step 5: UI Changes

**`NewProjectDialog.tsx`** -- Paywall intercept
- Before creating project #3+, check subscription status via `useSubscription`
- If `isOnFreeTier` and `projectCount >= 2`: show `PaywallDialog` instead of creating the project
- If `isTrialing` or `isActive`: proceed normally
- If `isPastDue`: show a banner but still allow project creation (grace)

**New `PaywallDialog.tsx`**
- Modal explaining: "You've used your 2 free projects. To continue, subscribe at $39/user/month (or save 15% with annual billing at $33/user/month)."
- Two buttons: "Start Monthly" / "Start Annual (Save 15%)" -- both redirect to Stripe Checkout with 14-day trial

**New `SubscriptionBanner.tsx`**
- Shown at the top of the app layout when:
  - Trialing: "Your trial ends in X days. Add a payment method."
  - Past due: "Payment failed. Update your payment method to continue."
- Includes a CTA linking to Stripe's billing portal

### Step 6: Auto-Update Seat Count

When employees are added or removed (via `AddEmployeeDialog` or `delete-employee` edge function):
- After the employee change, call a new edge function `update-subscription-seats` that:
  1. Counts current users in the company
  2. Calls `stripe.subscriptions.update()` with the new `quantity` and `proration_behavior: 'always_invoice'`
  3. Updates `subscriptions.user_count`

### Files to Create
- `src/hooks/useSubscription.ts`
- `src/components/PaywallDialog.tsx`
- `src/components/SubscriptionBanner.tsx`
- `supabase/functions/create-checkout-session/index.ts`
- `supabase/functions/stripe-webhook/index.ts`
- `supabase/functions/update-subscription-seats/index.ts`
- 1 database migration

### Files to Modify
- `src/components/NewProjectDialog.tsx` (add subscription check)
- `src/components/employees/AddEmployeeDialog.tsx` (trigger seat update)
- `supabase/functions/delete-employee/index.ts` (trigger seat update)
- App layout component (add SubscriptionBanner)

### Implementation Order
1. Enable Stripe (requires your secret key)
2. Database migration
3. Edge functions (checkout, webhook, seat update)
4. `useSubscription` hook
5. PaywallDialog + SubscriptionBanner UI
6. Wire into NewProjectDialog and employee flows

### Before We Start
You will need your **Stripe Secret Key** from the [Stripe Dashboard](https://dashboard.stripe.com/apikeys). Once you confirm you're ready, I'll enable Stripe and begin building.

