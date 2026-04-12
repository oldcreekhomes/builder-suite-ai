

## Fix Subscription Gating Issues

### Changes

**1. Remove the SubscriptionBanner entirely**
- Delete the `SubscriptionBanner` import and usage from `SidebarLayout.tsx`
- The full-screen paywall already handles the messaging; the banner is redundant and barely legible.

**2. Update the paywall screen styling in `SubscriptionGate.tsx`**
- Change the lock icon color to red (`text-red-500`) and its background to `bg-red-100`
- Change the "Subscribe Now" button to a green background (`bg-green-600 hover:bg-green-700`)
- Remove the "Go to Settings" button entirely, since Settings should also be locked

**3. Lock ALL routes when subscription is needed (including Settings)**
- Remove the `/settings` route exemption from `SubscriptionGate.tsx`
- The only action available to an unpaid owner is clicking "Subscribe Now" which opens the PaywallDialog (Stripe checkout) directly on the paywall screen itself

### Files to modify
- `src/components/SidebarLayout.tsx` — remove SubscriptionBanner
- `src/components/SubscriptionGate.tsx` — restyle lock/button, remove Settings exemption

