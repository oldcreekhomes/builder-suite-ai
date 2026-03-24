

## Fix: "Add Task Above" Failing — RPC Parameter Serialization Bug

### What's Happening

The error in the network tab is clear:

```
POST /rpc/bulk_update_hierarchy_numbers → 400
Response: {"code":"22023","message":"cannot extract elements from a scalar"}
```

The `bulk_update_hierarchy_numbers` RPC expects a `jsonb` array, but the client passes `JSON.stringify(updates)` — a **string**. PostgREST wraps it as a JSON string scalar (`"[{...}]"`) instead of a JSON array (`[{...}]`), so `jsonb_array_elements()` fails.

The edge function fallback has the same bug (line 48 of the edge function also uses `JSON.stringify`).

This likely broke when the Supabase JS client or PostgREST was updated — the behavior of how stringified JSON is coerced into `jsonb` parameters changed.

### Root Cause

**File: `src/hooks/useTaskBulkMutations.ts`, line 98-99:**
```typescript
await supabase.rpc('bulk_update_hierarchy_numbers', {
  updates: JSON.stringify(updates)  // ← Bug: sends string, not jsonb array
});
```

**File: `supabase/functions/bulk-update-hierarchies/index.ts`, line 47-48:**
```typescript
await supabase.rpc('bulk_update_hierarchy_numbers', {
  updates: JSON.stringify(updates)  // ← Same bug in edge function
});
```

### Fix

Three changes, all small:

1. **`src/hooks/useTaskBulkMutations.ts` (~line 98):** Pass `updates` directly without `JSON.stringify`. PostgREST natively serializes JS arrays/objects to `jsonb`.

2. **`supabase/functions/bulk-update-hierarchies/index.ts` (~line 47):** Same fix — remove `JSON.stringify`, pass `updates` directly.

3. **Defensive SQL fix (migration):** Update the `bulk_update_hierarchy_numbers` function to handle both cases — if it receives a string, cast it to jsonb first. This prevents future breakage:
```sql
CREATE OR REPLACE FUNCTION public.bulk_update_hierarchy_numbers(updates jsonb)
RETURNS integer AS $$
DECLARE
  update_record jsonb;
  updated_count integer := 0;
  parsed_updates jsonb;
BEGIN
  -- Handle case where updates is a JSON string (double-encoded)
  IF jsonb_typeof(updates) = 'string' THEN
    parsed_updates := updates::text::jsonb;
  ELSE
    parsed_updates := updates;
  END IF;

  FOR update_record IN SELECT * FROM jsonb_array_elements(parsed_updates)
  LOOP
    UPDATE project_schedule_tasks
    SET hierarchy_number = update_record->>'hierarchy_number',
        updated_at = NOW()
    WHERE id = (update_record->>'id')::uuid;
    IF FOUND THEN updated_count := updated_count + 1; END IF;
  END LOOP;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';
```

### Why This Keeps Breaking

This is the same pattern as the reconciliation issue — nothing changed in your code, but the Supabase client library or PostgREST version was updated, changing how parameters are serialized. The defensive SQL fix ensures this particular function works regardless of how the parameter arrives.

### Files Modified
- `src/hooks/useTaskBulkMutations.ts` — remove `JSON.stringify` wrapper
- `supabase/functions/bulk-update-hierarchies/index.ts` — remove `JSON.stringify` wrapper
- New migration — make the SQL function handle both string and array input

