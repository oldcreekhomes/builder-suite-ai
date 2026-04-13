

## Fix Cancel Subscription Edge Function

### Root Cause
The `cancel-subscription` edge function crashes with `Invalid time value` on line 67. In the Stripe API version `2025-08-27.basil`, `subscription.current_period_end` may already be a string or have a different structure than a raw Unix timestamp. Multiplying it by 1000 and passing to `new Date()` produces an invalid date.

### Fix
In `supabase/functions/cancel-subscription/index.ts` (line 67):
- Add safe handling for `current_period_end`: check if it's a number (Unix timestamp) or string, and convert accordingly
- Wrap the date conversion in a try-catch to prevent the entire function from failing on a date formatting issue

```typescript
// Replace line 67:
// current_period_end: new Date(updated.current_period_end * 1000).toISOString(),
// With:
current_period_end: typeof updated.current_period_end === 'number'
  ? new Date(updated.current_period_end * 1000).toISOString()
  : updated.current_period_end || null,
```

### Files to modify
1. `supabase/functions/cancel-subscription/index.ts` -- fix the date conversion on line 67

