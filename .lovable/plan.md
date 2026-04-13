

## Fix Billing Date & Remove Dialog Scrolling

### Problems
1. **"December 31, 1969"** — This is epoch 0 (`new Date(0)`). The edge function returns `current_period_end: null` when `sub.current_period_end` is falsy (line 69), but the frontend blindly does `new Date(null)` which yields epoch 0.
2. **Horizontal scrollbar** — The invoice row has too many fixed-width items (`w-24`, `w-20`, badge, description, icon) overflowing the `max-w-lg` dialog. The `overflow-y-auto` on DialogContent doesn't prevent horizontal overflow.

### Changes

**1. `supabase/functions/get-subscription-details/index.ts`**
- Add a fallback: if `sub.current_period_end` is 0 or falsy, compute the date from `sub.current_period_start + interval` or leave as `null`.
- Actually the real issue is simpler: Stripe's `current_period_end` is always set on active subscriptions. The value `0` or missing likely means the timestamp multiplication is wrong. Add logging to debug. But the safe fix is: guard `null` on the frontend side too.

**2. `src/components/settings/ManageSubscriptionDialog.tsx`**
- Guard against `null` `current_period_end` — show "—" instead of formatting epoch 0.
- Remove `overflow-y-auto` and `max-h-[85vh]` from DialogContent (no scrolling).
- Add `overflow-hidden` to prevent any scrollbar.
- Make invoice rows wrap better: remove fixed widths, use `min-w-0` and `truncate` properly, or simplify the invoice row layout to prevent horizontal overflow.

### Technical Details

**Date fix (frontend guard):**
```tsx
// Before:
{format(new Date(data.subscription.current_period_end), "MMMM d, yyyy")}

// After:
{data.subscription.current_period_end
  ? format(new Date(data.subscription.current_period_end), "MMMM d, yyyy")
  : "—"}
```

**Dialog no-scroll fix:**
```tsx
// Change:
<DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
// To:
<DialogContent className="max-w-lg overflow-hidden">
```

**Invoice row simplification** — remove the description column's `flex-1` stretch and fixed widths that cause overflow. Use a more compact layout.

### Files to modify
1. `src/components/settings/ManageSubscriptionDialog.tsx` — date guard + remove scroll + fix invoice row widths

