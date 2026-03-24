

## Fix: Collision-Safe Hierarchy Reordering

### Problem
The `bulk_update_hierarchy_numbers` function updates rows sequentially. When reordering (e.g., moving 8.20 after 8.24), the first row update creates a duplicate hierarchy number before the original is moved, violating the `unique_hierarchy_per_project` constraint.

### Solution
Replace the SQL function with a two-phase approach inside the same transaction:

1. **Phase 1**: Set all affected rows to temporary unique placeholders (`__temp__` + UUID)
2. **Phase 2**: Apply the final hierarchy numbers

This avoids any moment where two rows share the same hierarchy number.

### Changes

**1. New migration — replace `bulk_update_hierarchy_numbers`**

```sql
CREATE OR REPLACE FUNCTION public.bulk_update_hierarchy_numbers(updates jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  update_record jsonb;
  updated_count integer := 0;
  parsed_updates jsonb;
BEGIN
  -- Handle double-encoded JSON string
  IF jsonb_typeof(updates) = 'string' THEN
    parsed_updates := updates::text::jsonb;
  ELSE
    parsed_updates := updates;
  END IF;

  -- Phase 1: Move all affected rows to temporary placeholders
  FOR update_record IN SELECT * FROM jsonb_array_elements(parsed_updates)
  LOOP
    UPDATE project_schedule_tasks
    SET hierarchy_number = '__temp__' || (update_record->>'id'),
        updated_at = NOW()
    WHERE id = (update_record->>'id')::uuid;
  END LOOP;

  -- Phase 2: Apply final hierarchy numbers
  FOR update_record IN SELECT * FROM jsonb_array_elements(parsed_updates)
  LOOP
    UPDATE project_schedule_tasks
    SET hierarchy_number = update_record->>'hierarchy_number',
        updated_at = NOW()
    WHERE id = (update_record->>'id')::uuid;

    IF FOUND THEN
      updated_count := updated_count + 1;
    END IF;
  END LOOP;

  RETURN updated_count;
END;
$$;
```

**2. `src/hooks/useTaskBulkMutations.ts` — improve error message**

In the `onError` handler for `bulkUpdateHierarchies`, surface the actual database error message in the toast instead of a generic "Failed to update task positions".

### No other files change
The client code and edge function already pass updates correctly after the previous fix. This is purely a database function update.

