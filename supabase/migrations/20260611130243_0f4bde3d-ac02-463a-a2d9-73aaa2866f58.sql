CREATE OR REPLACE FUNCTION public.sync_reconciliation_row_flags()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ids uuid[];
  old_ids uuid[];
  removed_ids uuid[];
BEGIN
  IF NEW.status IS DISTINCT FROM 'completed' THEN
    RETURN NEW;
  END IF;

  BEGIN
    SELECT COALESCE(array_agg(v::uuid), ARRAY[]::uuid[])
      INTO ids
    FROM unnest(COALESCE(NEW.checked_transaction_ids, ARRAY[]::text[])) v
    WHERE v IS NOT NULL
      AND btrim(v) <> ''
      AND v ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  EXCEPTION WHEN OTHERS THEN
    ids := ARRAY[]::uuid[];
  END;

  IF TG_OP = 'UPDATE' THEN
    BEGIN
      SELECT COALESCE(array_agg(v::uuid), ARRAY[]::uuid[])
        INTO old_ids
      FROM unnest(COALESCE(OLD.checked_transaction_ids, ARRAY[]::text[])) v
      WHERE v IS NOT NULL
        AND btrim(v) <> ''
        AND v ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
    EXCEPTION WHEN OTHERS THEN
      old_ids := ARRAY[]::uuid[];
    END;

    SELECT COALESCE(array_agg(x), ARRAY[]::uuid[]) INTO removed_ids
    FROM (SELECT unnest(old_ids) AS x EXCEPT SELECT unnest(ids)) s;

    IF array_length(removed_ids, 1) > 0 THEN
      UPDATE public.checks
      SET reconciled = false, reconciliation_id = NULL, reconciliation_date = NULL, updated_at = now()
      WHERE id = ANY(removed_ids)
        AND reconciliation_id = NEW.id;

      UPDATE public.deposits
      SET reconciled = false, reconciliation_id = NULL, reconciliation_date = NULL, updated_at = now()
      WHERE id = ANY(removed_ids)
        AND reconciliation_id = NEW.id;

      UPDATE public.bills
      SET reconciled = false, reconciliation_id = NULL, reconciliation_date = NULL, updated_at = now()
      WHERE id = ANY(removed_ids)
        AND reconciliation_id = NEW.id;

      UPDATE public.bill_payments
      SET reconciled = false, reconciliation_id = NULL, reconciliation_date = NULL, updated_at = now()
      WHERE id = ANY(removed_ids)
        AND reconciliation_id = NEW.id;

      UPDATE public.credit_cards
      SET reconciled = false, reconciliation_id = NULL, reconciliation_date = NULL, updated_at = now()
      WHERE id = ANY(removed_ids)
        AND reconciliation_id = NEW.id;

      UPDATE public.journal_entry_lines
      SET reconciled = false, reconciliation_id = NULL, reconciliation_date = NULL, updated_at = now()
      WHERE reconciliation_id = NEW.id
        AND (
          id = ANY(removed_ids)
          OR journal_entry_id IN (
            SELECT je.id
            FROM public.journal_entries je
            WHERE je.source_id = ANY(removed_ids)
          )
        );
    END IF;
  END IF;

  IF array_length(ids, 1) > 0 THEN
    UPDATE public.checks
    SET reconciled = true, reconciliation_id = NEW.id, reconciliation_date = NEW.statement_date, updated_at = now()
    WHERE id = ANY(ids)
      AND project_id IS NOT DISTINCT FROM NEW.project_id
      AND bank_account_id = NEW.bank_account_id
      AND (reconciliation_id IS NULL OR reconciliation_id = NEW.id);

    UPDATE public.deposits
    SET reconciled = true, reconciliation_id = NEW.id, reconciliation_date = NEW.statement_date, updated_at = now()
    WHERE id = ANY(ids)
      AND project_id IS NOT DISTINCT FROM NEW.project_id
      AND bank_account_id = NEW.bank_account_id
      AND (reconciliation_id IS NULL OR reconciliation_id = NEW.id);

    UPDATE public.bills
    SET reconciled = true, reconciliation_id = NEW.id, reconciliation_date = NEW.statement_date, updated_at = now()
    WHERE id = ANY(ids)
      AND project_id IS NOT DISTINCT FROM NEW.project_id
      AND (reconciliation_id IS NULL OR reconciliation_id = NEW.id);

    UPDATE public.bill_payments
    SET reconciled = true, reconciliation_id = NEW.id, reconciliation_date = NEW.statement_date, updated_at = now()
    WHERE id = ANY(ids)
      AND project_id IS NOT DISTINCT FROM NEW.project_id
      AND payment_account_id = NEW.bank_account_id
      AND (reconciliation_id IS NULL OR reconciliation_id = NEW.id);

    UPDATE public.credit_cards
    SET reconciled = true, reconciliation_id = NEW.id, reconciliation_date = NEW.statement_date, updated_at = now()
    WHERE id = ANY(ids)
      AND project_id IS NOT DISTINCT FROM NEW.project_id
      AND credit_card_account_id = NEW.bank_account_id
      AND (reconciliation_id IS NULL OR reconciliation_id = NEW.id);

    UPDATE public.journal_entry_lines jel
    SET reconciled = true, reconciliation_id = NEW.id, reconciliation_date = NEW.statement_date, updated_at = now()
    FROM public.journal_entries je
    WHERE je.id = jel.journal_entry_id
      AND jel.project_id IS NOT DISTINCT FROM NEW.project_id
      AND jel.account_id = NEW.bank_account_id
      AND (jel.reconciliation_id IS NULL OR jel.reconciliation_id = NEW.id)
      AND (
        jel.id = ANY(ids)
        OR je.source_id = ANY(ids)
      );
  END IF;

  RETURN NEW;
END;
$function$;