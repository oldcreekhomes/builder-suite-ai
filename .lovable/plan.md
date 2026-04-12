

## Subscription Gating and Billing Settings

### Problem
Old Creek Homes has 32 projects but no subscription — they can use the entire app freely. Every home builder with 2+ projects must subscribe (or be trialing) to continue using the software.

### What I'll build (you just approve)

**1. Subscription Gate (hard block)**
- A `SubscriptionGate` component that wraps the app
- If an owner has 2+ projects and no active/trialing subscription, they see a full-screen paywall instead of the app
- Settings page remains accessible so they can subscribe
- Employees are exempt (their owner is responsible)

**2. "Subscription" tab in Settings**
- Shows plan status: Free, Trial (with days remaining), Active, Past Due
- Shows project count and seat count
- "Subscribe" button for free-tier users (opens PaywallDialog)
- "Manage Subscription" button for paying users (opens Stripe Customer Portal)
- Only visible to owners

**3. Customer Portal edge function**
- New `customer-portal` edge function
- Lets paying users manage billing (change card, cancel, switch plans) via Stripe's hosted portal

### What you need to do
- Approve the plan
- Click "approve" on any migration or deployment prompts I show you

### Files I'll create
- `src/components/SubscriptionGate.tsx`
- `src/components/settings/SubscriptionTab.tsx`
- `supabase/functions/customer-portal/index.ts`

### Files I'll modify
- `src/components/SidebarLayout.tsx` (add gate)
- `src/pages/Settings.tsx` (add Subscription tab)
- `src/hooks/useSubscription.ts` (minor adjustments)

### No action needed from you beyond approving this plan.

