CREATE OR REPLACE FUNCTION public.delete_bill_with_journal_entries(bill_id_param uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  is_reconciled boolean;
  payment_reconciled boolean;
  bp_record RECORD;
  alloc_record RECORD;
  sibling_bill RECORD;
BEGIN
  -- Block deletion if the bill itself is flagged reconciled
  SELECT EXISTS(
    SELECT 1 FROM public.bills
    WHERE id = bill_id_param AND reconciled = true
  ) INTO is_reconciled;

  IF is_reconciled = true THEN
    RAISE EXCEPTION 'Cannot delete this bill because its payment has been reconciled. Unreconcile the bank statement first.';
  END IF;

  -- Block deletion if ANY linked bill_payments row is reconciled
  SELECT EXISTS(
    SELECT 1
    FROM public.bill_payment_allocations bpa
    JOIN public.bill_payments bp ON bp.id = bpa.bill_payment_id
    WHERE bpa.bill_id = bill_id_param
      AND bp.reconciled = true
  ) INTO payment_reconciled;

  IF payment_reconciled = true THEN
    RAISE EXCEPTION 'Cannot delete this bill because a linked payment has been reconciled. Unreconcile the bank statement first.';
  END IF;

  -- Cascade-delete each linked bill_payment (and its allocations + JEs).
  -- Loop until none remain because removing one payment may affect siblings.
  FOR bp_record IN
    SELECT DISTINCT bp.id, bp.payment_date
    FROM public.bill_payments bp
    JOIN public.bill_payment_allocations bpa ON bpa.bill_payment_id = bp.id
    WHERE bpa.bill_id = bill_id_param
  LOOP
    -- For each sibling bill paid by this payment, roll back amount_paid/status
    FOR alloc_record IN
      SELECT bill_id, amount_allocated
      FROM public.bill_payment_allocations
      WHERE bill_payment_id = bp_record.id
        AND bill_id <> bill_id_param
    LOOP
      SELECT id, total_amount, amount_paid
        INTO sibling_bill
      FROM public.bills
      WHERE id = alloc_record.bill_id;

      IF FOUND THEN
        UPDATE public.bills
        SET amount_paid = GREATEST(COALESCE(amount_paid,0) - COALESCE(alloc_record.amount_allocated,0), 0),
            status = CASE
              WHEN (COALESCE(amount_paid,0) - COALESCE(alloc_record.amount_allocated,0)) >= COALESCE(total_amount,0)
                   AND COALESCE(total_amount,0) > 0
                THEN 'paid'::bill_status
              ELSE 'posted'::bill_status
            END,
            updated_at = now()
        WHERE id = sibling_bill.id;
      END IF;
    END LOOP;

    -- Delete JE lines + JEs created for this bill_payment
    DELETE FROM public.journal_entry_lines
    WHERE journal_entry_id IN (
      SELECT id FROM public.journal_entries
      WHERE source_type = 'bill_payment'
        AND source_id = bp_record.id
    );

    DELETE FROM public.journal_entries
    WHERE source_type = 'bill_payment'
      AND source_id = bp_record.id;

    -- Allocations cascade via FK ON DELETE CASCADE
    DELETE FROM public.bill_payments WHERE id = bp_record.id;
  END LOOP;

  -- Now delete the bill's own JEs and bill data
  DELETE FROM public.journal_entry_lines
  WHERE journal_entry_id IN (
    SELECT id FROM public.journal_entries
    WHERE (source_type = 'bill' OR source_type = 'bill_payment')
      AND source_id = bill_id_param
  );

  DELETE FROM public.journal_entries
  WHERE (source_type = 'bill' OR source_type = 'bill_payment')
    AND source_id = bill_id_param;

  DELETE FROM public.bill_lines WHERE bill_id = bill_id_param;
  DELETE FROM public.bill_attachments WHERE bill_id = bill_id_param;
  DELETE FROM public.bills WHERE id = bill_id_param;

  RETURN FOUND;
END;
$function$;