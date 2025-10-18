-- Drop and recreate get_reconciliation_defaults without owner_id constraints
DROP FUNCTION IF EXISTS public.get_reconciliation_defaults(uuid);

CREATE OR REPLACE FUNCTION public.get_reconciliation_defaults(bank_account_id uuid)
RETURNS TABLE(
  mode text,
  reconciliation_id uuid,
  beginning_balance numeric,
  statement_date date,
  source_completed_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
WITH active AS (
  SELECT id, statement_beginning_balance, statement_date, owner_id
  FROM public.bank_reconciliations
  WHERE bank_account_id = get_reconciliation_defaults.bank_account_id
    AND status = 'in_progress'
  ORDER BY updated_at DESC
  LIMIT 1
),
completed AS (
  SELECT id, statement_ending_balance, statement_date, owner_id
  FROM public.bank_reconciliations
  WHERE bank_account_id = get_reconciliation_defaults.bank_account_id
    AND status = 'completed'
  ORDER BY statement_date DESC, updated_at DESC
  LIMIT 1
)
SELECT 'active'::text AS mode, a.id, a.statement_beginning_balance::numeric, a.statement_date::date, NULL::uuid
FROM active a
UNION ALL
SELECT 'last_completed'::text AS mode, NULL::uuid, c.statement_ending_balance::numeric, (c.statement_date + interval '1 month')::date, c.id
FROM completed c
WHERE NOT EXISTS (SELECT 1 FROM active)
UNION ALL
SELECT 'none'::text AS mode, NULL::uuid, 0::numeric, NULL::date, NULL::uuid
WHERE NOT EXISTS (SELECT 1 FROM active) AND NOT EXISTS (SELECT 1 FROM completed);
$function$;