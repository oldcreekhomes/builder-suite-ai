

## Remove Trial, Change to 3 Free Projects, Simplify Checkout UI

### Summary
Remove the 14-day trial entirely. Users get 3 free projects (up from 2), and after that they pay immediately. The checkout order summary is simplified to show only the essential pricing info with the total due in green.

### Changes

**1. `src/hooks/useSubscription.ts`** — Change free tier limit from 2 to 3
- `projectCount < 2` → `projectCount < 3`
- `projectCount >= 2` → `projectCount >= 3`

**2. `supabase/functions/create-subscription/index.ts`** — Remove trial
- Remove `trial_period_days: 14` from `stripe.subscriptions.create`
- Change upserted status from `"trialing"` to `"active"`
- Remove `trial_ends_at` from the upsert

**3. `src/components/SubscriptionGate.tsx`** — Update UI
- **Subscription Required page**: Change "free tier limit of 2" to "3", remove "14-day free trial" footer text
- **CheckoutForm order summary**: Simplify left column to:
  - "BuilderSuite Pro" + "Quantity" on same row (both same font/color)
  - "$39/user/mo" + seat count number on the row below
  - "Due today" with actual amount (e.g. `$273`) in green
  - Remove: "14 days free", "Then $273/mo", "After trial ends" row, "Cancel anytime" text
- **Button text**: "Start trial" → "Subscribe"
- **Toast**: "Trial started!" → "Subscription started!"

**4. `src/components/PaywallDialog.tsx`** — Same UI updates
- Change "14-day free trial" references to direct subscription language
- Simplify CheckoutCardForm order summary (same as SubscriptionGate)
- Button: "Start trial" → "Subscribe"
- Toast: update message
- Description: change "2 free projects" to "3 free projects", remove trial mention

**5. `src/components/SubscriptionBanner.tsx`** — Remove trial-related banner text (if referencing trial)

### Checkout Order Summary Layout (after changes)
```text
┌─────────────────────────────────┐
│ BuilderSuite Pro      Quantity  │
│ $39/user/mo                  7  │
│─────────────────────────────────│
│ Due today              $273.00  │  ← green
└─────────────────────────────────┘
```

