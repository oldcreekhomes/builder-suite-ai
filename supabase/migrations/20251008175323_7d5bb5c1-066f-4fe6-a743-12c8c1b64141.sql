-- Update the delete_bill_with_journal_entries function to also delete bill_payment journal entries
CREATE OR REPLACE FUNCTION public.delete_bill_with_journal_entries(bill_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Delete journal entry lines for both bill and bill_payment entries
  DELETE FROM public.journal_entry_lines 
  WHERE journal_entry_id IN (
    SELECT id FROM public.journal_entries 
    WHERE (source_type = 'bill' OR source_type = 'bill_payment') 
    AND source_id = bill_id_param
  );
  
  -- Delete journal entries for both bill and bill_payment
  DELETE FROM public.journal_entries 
  WHERE (source_type = 'bill' OR source_type = 'bill_payment') 
  AND source_id = bill_id_param;
  
  -- Delete bill lines
  DELETE FROM public.bill_lines 
  WHERE bill_id = bill_id_param;
  
  -- Delete bill attachments
  DELETE FROM public.bill_attachments 
  WHERE bill_id = bill_id_param;
  
  -- Finally delete the bill
  DELETE FROM public.bills 
  WHERE id = bill_id_param;
  
  RETURN FOUND;
END;
$function$;