CREATE OR REPLACE FUNCTION public.delete_consolidated_bill_payment(bill_payment_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  bp RECORD;
  bill_ids uuid[];
  bid uuid;
BEGIN
  SELECT * INTO bp FROM public.bill_payments WHERE id = bill_payment_id_param;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  IF bp.reconciled THEN
    RAISE EXCEPTION 'This payment is reconciled and cannot be deleted. Undo the reconciliation first.';
  END IF;

  IF bp.project_id IS NOT NULL AND bp.owner_id IS NOT NULL THEN
    IF public.is_period_closed(bp.payment_date, bp.project_id, bp.owner_id) THEN
      RAISE EXCEPTION 'This payment falls in a closed accounting period and cannot be deleted. Reopen the period first.';
    END IF;
  END IF;

  SELECT COALESCE(array_agg(DISTINCT bill_id), ARRAY[]::uuid[])
    INTO bill_ids
  FROM public.bill_payment_allocations
  WHERE bill_payment_id = bill_payment_id_param;

  -- Remove journal entries created for this payment (original + any reversal)
  DELETE FROM public.journal_entry_lines
  WHERE journal_entry_id IN (
    SELECT id FROM public.journal_entries
    WHERE source_type = 'bill_payment'
      AND source_id = bill_payment_id_param
  );

  DELETE FROM public.journal_entries
  WHERE source_type = 'bill_payment'
    AND source_id = bill_payment_id_param;

  -- Remove allocations then the payment itself
  DELETE FROM public.bill_payment_allocations WHERE bill_payment_id = bill_payment_id_param;
  DELETE FROM public.bill_payments WHERE id = bill_payment_id_param;

  -- Permanently delete every bill this payment paid
  FOREACH bid IN ARRAY bill_ids LOOP
    PERFORM public.delete_bill_with_journal_entries(bid);
  END LOOP;

  RETURN true;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.delete_consolidated_bill_payment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_consolidated_bill_payment(uuid) TO service_role;