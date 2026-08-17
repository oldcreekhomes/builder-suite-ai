ALTER TABLE public.bill_payments
  ADD COLUMN IF NOT EXISTS reversed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reversed_by uuid;

CREATE OR REPLACE FUNCTION public.reverse_consolidated_bill_payment(bill_payment_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  bp RECORD;
  alloc RECORD;
  je RECORD;
  line_record RECORD;
  new_je_id uuid;
BEGIN
  SELECT * INTO bp FROM public.bill_payments WHERE id = bill_payment_id_param;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bill payment not found';
  END IF;

  IF bp.reversed_at IS NOT NULL THEN
    RAISE EXCEPTION 'This payment has already been reversed';
  END IF;

  IF bp.reconciled THEN
    RAISE EXCEPTION 'This payment is reconciled and cannot be reversed';
  END IF;

  IF public.is_period_closed(bp.payment_date, bp.project_id, bp.owner_id) THEN
    RAISE EXCEPTION 'The books are closed for this date. Reopen the accounting period first.';
  END IF;

  FOR alloc IN
    SELECT * FROM public.bill_payment_allocations WHERE bill_payment_id = bill_payment_id_param
  LOOP
    -- Locate the payment journal entry for this bill on this payment date hitting the payment account
    FOR je IN
      SELECT j.*
      FROM public.journal_entries j
      WHERE j.source_type = 'bill_payment'
        AND j.source_id = alloc.bill_id
        AND j.entry_date = bp.payment_date
        AND j.reversed_at IS NULL
        AND COALESCE(j.is_reversal, false) = false
        AND EXISTS (
          SELECT 1 FROM public.journal_entry_lines l
          WHERE l.journal_entry_id = j.id
            AND l.account_id = bp.payment_account_id
        )
    LOOP
      new_je_id := gen_random_uuid();

      INSERT INTO public.journal_entries (
        id, owner_id, entry_date, description, source_type, source_id, is_reversal, reverses_id
      ) VALUES (
        new_je_id, je.owner_id, CURRENT_DATE,
        'REVERSAL: ' || COALESCE(je.description, 'Bill Payment'),
        'bill_payment', alloc.bill_id, true, je.id
      );

      FOR line_record IN
        SELECT * FROM public.journal_entry_lines WHERE journal_entry_id = je.id
      LOOP
        INSERT INTO public.journal_entry_lines (
          journal_entry_id, owner_id, account_id, debit, credit, memo, is_reversal, reverses_line_id,
          project_id, cost_code_id, lot_id
        ) VALUES (
          new_je_id, line_record.owner_id, line_record.account_id,
          line_record.credit, line_record.debit, line_record.memo, true, line_record.id,
          line_record.project_id, line_record.cost_code_id, line_record.lot_id
        );
      END LOOP;

      UPDATE public.journal_entries
      SET reversed_at = NOW(), reversed_by_id = new_je_id, updated_at = NOW()
      WHERE id = je.id;
    END LOOP;

    -- Restore the bill balance / status (cent-precise)
    UPDATE public.bills b
    SET amount_paid = GREATEST(ROUND(COALESCE(b.amount_paid, 0)::numeric - alloc.amount_allocated::numeric, 2), 0),
        status = CASE
          WHEN ROUND(COALESCE(b.amount_paid, 0)::numeric - alloc.amount_allocated::numeric, 2) >= ROUND(b.total_amount::numeric, 2)
            THEN 'paid'::bill_status
          ELSE 'posted'::bill_status
        END,
        updated_at = NOW()
    WHERE b.id = alloc.bill_id
      AND b.status <> 'reversed'::bill_status;
  END LOOP;

  UPDATE public.bill_payments
  SET reversed_at = NOW(), reversed_by = auth.uid(), updated_at = NOW()
  WHERE id = bill_payment_id_param;

  RETURN true;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.reverse_consolidated_bill_payment(uuid) TO authenticated;