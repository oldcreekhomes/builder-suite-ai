

## Fix: Stripe Checkout Redirect Not Working

### The Problem
The edge function is working correctly — logs confirm checkout sessions are created successfully and URLs are returned. However, `window.location.href = data.url` does not work inside the Lovable preview iframe because cross-origin navigations are blocked. The page appears to load indefinitely.

### Solution
Change `window.location.href` to `window.open(data.url, "_blank")` in both `SubscriptionGate.tsx` and `PaywallDialog.tsx`. This opens the Stripe hosted checkout in a new tab, which works both in the preview iframe and in production.

### Files to modify
1. **`src/components/SubscriptionGate.tsx`** — line 28: change `window.location.href = data.url` to `window.open(data.url, "_blank")`
2. **`src/components/PaywallDialog.tsx`** — same change if it has `window.location.href`

### Result
Clicking "Subscribe Monthly" or "Subscribe Annual" will open Stripe's hosted checkout page in a new browser tab with the compact two-column layout.

