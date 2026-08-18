
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
  paid numeric;
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

  DELETE FROM public.journal_entry_lines
  WHERE journal_entry_id IN (
    SELECT id FROM public.journal_entries
    WHERE source_type = 'bill_payment'
      AND source_id = bill_payment_id_param
  );

  DELETE FROM public.journal_entries
  WHERE source_type = 'bill_payment'
    AND source_id = bill_payment_id_param;

  DELETE FROM public.bill_payment_allocations WHERE bill_payment_id = bill_payment_id_param;
  DELETE FROM public.bill_payments WHERE id = bill_payment_id_param;

  -- Keep the bills: return each one to its remaining unpaid state
  FOREACH bid IN ARRAY bill_ids LOOP
    SELECT COALESCE(SUM(al.amount_allocated), 0) INTO paid
    FROM public.bill_payment_allocations al
    WHERE al.bill_id = bid;

    UPDATE public.bills b
       SET amount_paid = paid,
           status = CASE WHEN paid >= b.total_amount AND b.total_amount > 0 THEN 'paid'::bill_status ELSE 'posted'::bill_status END,
           updated_at = now()
     WHERE b.id = bid
       AND b.status <> 'void';
  END LOOP;

  RETURN true;
END;
$function$;
