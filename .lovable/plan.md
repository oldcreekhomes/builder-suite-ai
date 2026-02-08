

# Fix Edge Function Error

## Problem Found

The edge function has a JavaScript error on line 246-250:

```typescript
await supabase.rpc('increment_marketplace_message_count', { 
  company_id: marketplaceCompanyId 
}).catch(() => {
  // Fallback already handled above
});
```

The Supabase JS client v2 `.rpc()` method returns `Promise<{data, error}>`, not a traditional promise that can use `.catch()`. This causes the error: `"supabase.rpc(...).catch is not a function"`.

---

## Solution

Remove the redundant RPC call entirely since we already increment the message_count with the update statement on lines 233-243. The RPC function `increment_marketplace_message_count` was never created in the database anyway, so it would fail regardless.

### Changes Required

**File**: `supabase/functions/send-marketplace-message/index.ts`

Remove lines 245-250:
```typescript
// Use RPC to increment atomically
await supabase.rpc('increment_marketplace_message_count', { 
  company_id: marketplaceCompanyId 
}).catch(() => {
  // Fallback already handled above
});
```

Also improve the message_count update logic on lines 232-243 to use a proper SQL increment:

```typescript
// Increment message count on company atomically
await supabase
  .from('marketplace_companies')
  .update({ 
    message_count: supabase.raw('COALESCE(message_count, 0) + 1')
  })
  .eq('id', marketplaceCompanyId);
```

Or alternatively, use a simpler approach since the Supabase client doesn't support raw SQL in updates:

```typescript
// Get current count and increment
const { data: currentCompany } = await supabase
  .from('marketplace_companies')
  .select('message_count')
  .eq('id', marketplaceCompanyId)
  .single();

await supabase
  .from('marketplace_companies')
  .update({ 
    message_count: (currentCompany?.message_count || 0) + 1 
  })
  .eq('id', marketplaceCompanyId);
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/send-marketplace-message/index.ts` | Remove lines 245-250 (the broken RPC call), keep the existing update logic |

---

## Expected Result

After this fix:
- Edge function will work correctly
- Messages will be sent via email
- Messages will be recorded in `marketplace_messages` table
- Company `message_count` will be incremented properly

