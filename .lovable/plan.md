## Fix: Employee Activity crash — "CREATE TABLE is not allowed in a non-volatile function"

### Root cause
`get_employee_activity_summary` is declared `STABLE`, but its body uses `CREATE TEMP TABLE` and `INSERT INTO tmp_acts`. Postgres only permits those in `VOLATILE` functions.

### Fix (single migration)
Recreate the function with `VOLATILE` instead of `STABLE`. Body and return shape stay identical.

```sql
CREATE OR REPLACE FUNCTION public.get_employee_activity_summary(...)
RETURNS TABLE(...)
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER
SET search_path TO 'public'
AS $function$ ... unchanged body ... $function$;
```

No frontend changes needed — the hook and UI already match the return shape.