
-- Trigger function: stamp cleared flags when a reconciliation is completed or its checked IDs change
CREATE OR REPLACE FUNCTION public.sync_reconciliation_row_flags()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ids uuid[];
  old_ids uuid[];
  removed_ids uuid[];
BEGIN
  -- Only act when reconciliation is in completed state after the change
  IF NEW.status IS DISTINCT FROM 'completed' THEN
    RETURN NEW;
  END IF;

  -- Parse checked_transaction_ids into uuid[]
  BEGIN
    SELECT COALESCE(array_agg((v)::uuid), ARRAY[]::uuid[])
      INTO ids
    FROM jsonb_array_elements_text(COALESCE(NEW.checked_transaction_ids, '[]'::jsonb)) v;
  EXCEPTION WHEN OTHERS THEN
    ids := ARRAY[]::uuid[];
  END;

  IF TG_OP = 'UPDATE' THEN
    BEGIN
      SELECT COALESCE(array_agg((v)::uuid), ARRAY[]::uuid[])
        INTO old_ids
      FROM jsonb_array_elements_text(COALESCE(OLD.checked_transaction_ids, '[]'::jsonb)) v;
    EXCEPTION WHEN OTHERS THEN
      old_ids := ARRAY[]::uuid[];
    END;
    -- Clear stamps for ids that were removed from this reconciliation
    SELECT COALESCE(array_agg(x), ARRAY[]::uuid[]) INTO removed_ids
    FROM (SELECT unnest(old_ids) AS x EXCEPT SELECT unnest(ids)) s;

    IF array_length(removed_ids, 1) > 0 THEN
      UPDATE public.checks SET reconciled = false, reconciliation_id = NULL, reconciliation_date = NULL, updated_at = now()
        WHERE id = ANY(removed_ids) AND reconciliation_id = NEW.id;
      UPDATE public.deposits SET reconciled = false, reconciliation_id = NULL, reconciliation_date = NULL, updated_at = now()
        WHERE id = ANY(removed_ids) AND reconciliation_id = NEW.id;
      UPDATE public.bills SET reconciled = false, reconciliation_id = NULL, reconciliation_date = NULL, updated_at = now()
        WHERE id = ANY(removed_ids) AND reconciliation_id = NEW.id;
      UPDATE public.bill_payments SET reconciled = false, reconciliation_id = NULL, reconciliation_date = NULL, updated_at = now()
        WHERE id = ANY(removed_ids) AND reconciliation_id = NEW.id;
      UPDATE public.credit_cards SET reconciled = false, reconciliation_id = NULL, reconciliation_date = NULL, updated_at = now()
        WHERE id = ANY(removed_ids) AND reconciliation_id = NEW.id;
      UPDATE public.journal_entry_lines SET reconciled = false, reconciliation_id = NULL, reconciliation_date = NULL, updated_at = now()
        WHERE id = ANY(removed_ids) AND reconciliation_id = NEW.id;
    END IF;
  END IF;

  IF array_length(ids, 1) > 0 THEN
    UPDATE public.checks SET reconciled = true, reconciliation_id = NEW.id, reconciliation_date = NEW.statement_date, updated_at = now()
      WHERE id = ANY(ids) AND (reconciliation_id IS NULL OR reconciliation_id = NEW.id);
    UPDATE public.deposits SET reconciled = true, reconciliation_id = NEW.id, reconciliation_date = NEW.statement_date, updated_at = now()
      WHERE id = ANY(ids) AND (reconciliation_id IS NULL OR reconciliation_id = NEW.id);
    UPDATE public.bills SET reconciled = true, reconciliation_id = NEW.id, reconciliation_date = NEW.statement_date, updated_at = now()
      WHERE id = ANY(ids) AND (reconciliation_id IS NULL OR reconciliation_id = NEW.id);
    UPDATE public.bill_payments SET reconciled = true, reconciliation_id = NEW.id, reconciliation_date = NEW.statement_date, updated_at = now()
      WHERE id = ANY(ids) AND (reconciliation_id IS NULL OR reconciliation_id = NEW.id);
    UPDATE public.credit_cards SET reconciled = true, reconciliation_id = NEW.id, reconciliation_date = NEW.statement_date, updated_at = now()
      WHERE id = ANY(ids) AND (reconciliation_id IS NULL OR reconciliation_id = NEW.id);
    UPDATE public.journal_entry_lines SET reconciled = true, reconciliation_id = NEW.id, reconciliation_date = NEW.statement_date, updated_at = now()
      WHERE id = ANY(ids) AND (reconciliation_id IS NULL OR reconciliation_id = NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bank_reconciliations_sync_flags ON public.bank_reconciliations;
CREATE TRIGGER bank_reconciliations_sync_flags
AFTER INSERT OR UPDATE OF status, checked_transaction_ids
ON public.bank_reconciliations
FOR EACH ROW
EXECUTE FUNCTION public.sync_reconciliation_row_flags();

-- One-time global backfill: stamp cleared markers across every completed reconciliation
DO $$
DECLARE
  r RECORD;
  ids uuid[];
BEGIN
  FOR r IN
    SELECT id, statement_date, checked_transaction_ids
    FROM public.bank_reconciliations
    WHERE status = 'completed'
      AND checked_transaction_ids IS NOT NULL
  LOOP
    BEGIN
      SELECT COALESCE(array_agg((v)::uuid), ARRAY[]::uuid[])
        INTO ids
      FROM jsonb_array_elements_text(r.checked_transaction_ids) v;
    EXCEPTION WHEN OTHERS THEN
      ids := ARRAY[]::uuid[];
    END;

    IF array_length(ids, 1) IS NULL THEN
      CONTINUE;
    END IF;

    UPDATE public.checks SET reconciled = true, reconciliation_id = r.id, reconciliation_date = r.statement_date, updated_at = now()
      WHERE id = ANY(ids) AND reconciliation_id IS NULL;
    UPDATE public.deposits SET reconciled = true, reconciliation_id = r.id, reconciliation_date = r.statement_date, updated_at = now()
      WHERE id = ANY(ids) AND reconciliation_id IS NULL;
    UPDATE public.bills SET reconciled = true, reconciliation_id = r.id, reconciliation_date = r.statement_date, updated_at = now()
      WHERE id = ANY(ids) AND reconciliation_id IS NULL;
    UPDATE public.bill_payments SET reconciled = true, reconciliation_id = r.id, reconciliation_date = r.statement_date, updated_at = now()
      WHERE id = ANY(ids) AND reconciliation_id IS NULL;
    UPDATE public.credit_cards SET reconciled = true, reconciliation_id = r.id, reconciliation_date = r.statement_date, updated_at = now()
      WHERE id = ANY(ids) AND reconciliation_id IS NULL;
    UPDATE public.journal_entry_lines SET reconciled = true, reconciliation_id = r.id, reconciliation_date = r.statement_date, updated_at = now()
      WHERE id = ANY(ids) AND reconciliation_id IS NULL;
  END LOOP;
END $$;
