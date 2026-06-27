## Changes

Remove the annual option entirely from the paywall — show only a single monthly plan.

### `src/components/PaywallDialog.tsx` (and/or `src/components/SubscriptionGate.tsx`, wherever the two-card layout lives)
- Remove the Annual card and the "Save 15%" badge.
- Remove the Monthly/Annual toggle/state — there's only one plan now.
- Render a single centered pricing card:
  - Title: **Subscribe**
  - Price: **$39 per user / month**
  - Button: crown icon + **"Subscribe"** (no "Monthly" suffix)
- Keep "Cancel anytime from your account settings." below.
- When the button is clicked, always call `create-subscription` with `billing_interval: "monthly"`.

### Backend (`supabase/functions/create-subscription/index.ts`)
- No code change required — it still accepts `monthly` and ignores `annual` from now on.
- Leave the `annual` price ID in the `PRICES` map but unused, so we can re-enable it later without a redeploy.

No other files affected. No DB changes.
