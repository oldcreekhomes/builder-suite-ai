CREATE OR REPLACE FUNCTION public.delete_bill_with_journal_entries(bill_id_param uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  is_reconciled boolean;
  has_payment boolean;
BEGIN
  -- Block deletion if any payment for this bill is reconciled
  SELECT EXISTS(
    SELECT 1 FROM public.bills 
    WHERE id = bill_id_param AND reconciled = true
  ) INTO is_reconciled;
  
  IF is_reconciled = true THEN
    RAISE EXCEPTION 'Cannot delete this bill because its payment has been reconciled. Unreconcile the bank statement first.';
  END IF;

  -- Block deletion if the bill has a recorded payment allocation
  SELECT EXISTS(
    SELECT 1 FROM public.bill_payment_allocations WHERE bill_id = bill_id_param
  ) INTO has_payment;

  IF has_payment = true THEN
    RAISE EXCEPTION 'Cannot delete this bill because it has a recorded payment. Void or delete the payment first, then delete the bill.';
  END IF;

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