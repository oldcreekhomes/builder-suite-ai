CREATE OR REPLACE FUNCTION public.reverse_bill_payment(journal_entry_id_param uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  je_record RECORD;
  bill_id_var uuid;
  payment_amount numeric;
  new_reversing_je_id uuid;
  line_record RECORD;
BEGIN
  SELECT * INTO je_record
  FROM public.journal_entries
  WHERE id = journal_entry_id_param AND source_type = 'bill_payment';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Journal entry not found or not a bill_payment';
  END IF;

  bill_id_var := je_record.source_id;

  SELECT COALESCE(SUM(debit), 0) INTO payment_amount
  FROM public.journal_entry_lines
  WHERE journal_entry_id = journal_entry_id_param AND debit > 0;

  new_reversing_je_id := gen_random_uuid();

  INSERT INTO public.journal_entries (
    id, owner_id, entry_date, description, source_type, source_id, is_reversal, reverses_id
  ) VALUES (
    new_reversing_je_id, je_record.owner_id, CURRENT_DATE,
    'REVERSAL: ' || je_record.description, 'bill_payment', bill_id_var, true, journal_entry_id_param
  );

  FOR line_record IN
    SELECT * FROM public.journal_entry_lines
    WHERE journal_entry_id = journal_entry_id_param
  LOOP
    INSERT INTO public.journal_entry_lines (
      journal_entry_id, owner_id, account_id, debit, credit, memo,
      is_reversal, reverses_line_id, project_id, cost_code_id, lot_id
    ) VALUES (
      new_reversing_je_id, line_record.owner_id, line_record.account_id,
      line_record.credit, line_record.debit, line_record.memo,
      true, line_record.id, line_record.project_id, line_record.cost_code_id, line_record.lot_id
    );
  END LOOP;

  UPDATE public.journal_entries
  SET reversed_at = NOW(), reversed_by_id = new_reversing_je_id, updated_at = NOW()
  WHERE id = journal_entry_id_param;

  UPDATE public.bills
  SET amount_paid = GREATEST(amount_paid - payment_amount, 0),
      status = CASE
        WHEN (amount_paid - payment_amount) >= total_amount THEN 'paid'::bill_status
        WHEN (amount_paid - payment_amount) > 0 THEN 'posted'::bill_status
        ELSE 'posted'::bill_status
      END,
      updated_at = NOW()
  WHERE id = bill_id_var;

  RETURN true;
END;
$function$;

UPDATE public.journal_entry_lines l
SET project_id = o.project_id,
    cost_code_id = o.cost_code_id,
    lot_id = o.lot_id
FROM public.journal_entry_lines o
WHERE l.reverses_line_id = o.id
  AND l.project_id IS NULL
  AND l.journal_entry_id IN ('52699a40-683a-483b-a7f4-3f35823a5340','e7fc4180-47db-4473-8b60-fa89f3bedbba');