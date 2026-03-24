

## Fix: "Failed to send employee invitation" Error

### Root Cause

The edge function logs show: **"Database error creating new user"** — this happens inside the `handle_new_user()` database trigger when a new auth user is created.

The trigger `handle_new_user()` is defined with `SET search_path TO ''` (a security best practice). When it inserts into `public.users`, a BEFORE INSERT trigger called `normalize_phone_on_save()` fires. This function calls `normalize_phone_number(NEW.phone_number)` — but without a fully qualified schema reference. Because it inherits the empty search_path from `handle_new_user()`, PostgreSQL cannot find the `normalize_phone_number` function and the entire chain fails.

**Chain of failure:**
1. Edge function calls `createUser()` → inserts into `auth.users`
2. `on_auth_user_created` trigger fires → `handle_new_user()` (search_path = '')
3. `handle_new_user()` does `INSERT INTO public.users`
4. BEFORE INSERT trigger `normalize_phone_on_save()` fires
5. Calls `normalize_phone_number(...)` — **fails** because search_path is empty and the function is in `public` schema
6. Entire transaction rolls back → "Database error creating new user"

### Fix

One SQL migration to fully qualify the function call in `normalize_phone_on_save`:

```sql
CREATE OR REPLACE FUNCTION public.normalize_phone_on_save()
  RETURNS trigger
  LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.phone_number IS NOT NULL AND NEW.phone_number != '' THEN
    NEW.phone_number := public.normalize_phone_number(NEW.phone_number);
  END IF;
  RETURN NEW;
END;
$function$;
```

The only change is `normalize_phone_number(...)` → `public.normalize_phone_number(...)`. This ensures the function is found regardless of the calling context's search_path.

No code file changes needed — this is a database-only fix.

