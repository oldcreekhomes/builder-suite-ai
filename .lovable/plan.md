## Problem

Saving billing email triggers `queryClient.invalidateQueries(["subscription-details"])` which puts the panel back into loading state, so the user sees: old email → loading skeleton/empty → new email. That's the "double flicker."

## Fix

In `src/components/settings/SubscriptionTab.tsx` `handleSaveEmail`:
- Replace `invalidateQueries` with `queryClient.setQueryData(["subscription-details"], (old) => ({ ...old, billingEmail: trimmed }))` to update the cache in place.
- No refetch needed — the edge function already returned success and we know the new value.

Result: panel never re-enters loading; the displayed email swaps once, instantly, with no flicker.

## Out of scope

No changes to the edge function, layout, or other queries.
