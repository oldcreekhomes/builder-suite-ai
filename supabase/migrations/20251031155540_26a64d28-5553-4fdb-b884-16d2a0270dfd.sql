-- Create function to safely reverse a bill payment
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
  -- Fetch the journal entry and verify it's a bill_payment
  SELECT * INTO je_record
  FROM public.journal_entries
  WHERE id = journal_entry_id_param AND source_type = 'bill_payment';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Journal entry not found or not a bill_payment';
  END IF;
  
  -- Get the bill_id from source_id
  bill_id_var := je_record.source_id;
  
  -- Calculate payment amount (sum of debits, which represents the payment)
  SELECT COALESCE(SUM(debit), 0) INTO payment_amount
  FROM public.journal_entry_lines
  WHERE journal_entry_id = journal_entry_id_param AND debit > 0;
  
  -- Create new reversing journal entry
  new_reversing_je_id := gen_random_uuid();
  
  INSERT INTO public.journal_entries (
    id,
    owner_id,
    entry_date,
    description,
    source_type,
    source_id,
    is_reversal,
    reverses_id
  ) VALUES (
    new_reversing_je_id,
    je_record.owner_id,
    CURRENT_DATE,
    'REVERSAL: ' || je_record.description,
    'bill_payment',
    bill_id_var,
    true,
    journal_entry_id_param
  );
  
  -- Create reversing lines (flip debits and credits)
  FOR line_record IN 
    SELECT * FROM public.journal_entry_lines 
    WHERE journal_entry_id = journal_entry_id_param
  LOOP
    INSERT INTO public.journal_entry_lines (
      journal_entry_id,
      owner_id,
      account_id,
      debit,
      credit,
      memo,
      is_reversal,
      reverses_line_id
    ) VALUES (
      new_reversing_je_id,
      line_record.owner_id,
      line_record.account_id,
      line_record.credit,  -- Flip: credit becomes debit
      line_record.debit,   -- Flip: debit becomes credit
      line_record.memo,
      true,
      line_record.id
    );
  END LOOP;
  
  -- Mark original journal entry as reversed
  UPDATE public.journal_entries
  SET reversed_at = NOW(),
      reversed_by_id = new_reversing_je_id,
      updated_at = NOW()
  WHERE id = journal_entry_id_param;
  
  -- Update the bill to restore the amount
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