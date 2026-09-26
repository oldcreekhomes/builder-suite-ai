CREATE UNIQUE INDEX IF NOT EXISTS bank_reconciliations_one_per_statement
  ON public.bank_reconciliations (project_id, bank_account_id, statement_date);

CREATE OR REPLACE FUNCTION public.can_close_period(check_project_id uuid, check_date date)
 RETURNS TABLE(can_close boolean, reason text)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  incomplete_recons INTEGER;
  details TEXT;
BEGIN
  SELECT COUNT(*), string_agg(COALESCE(a.code || ' - ' || a.name, 'Unknown account') || ' (' || to_char(r.statement_date, 'MM/DD/YYYY') || ')', ', ' ORDER BY r.statement_date)
  INTO incomplete_recons, details
  FROM bank_reconciliations r
  LEFT JOIN accounts a ON a.id = r.bank_account_id
  WHERE r.project_id = check_project_id
    AND r.statement_date <= check_date
    AND r.status != 'completed';

  IF incomplete_recons > 0 THEN
    RETURN QUERY SELECT FALSE,
      'Cannot close books: unfinished reconciliation(s) - ' || details || '.';
  ELSE
    RETURN QUERY SELECT TRUE, 'All reconciliations completed.';
  END IF;
END;
$function$;