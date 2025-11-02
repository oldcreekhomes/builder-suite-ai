-- Add reconciliation protection to delete functions

-- Update delete_deposit_with_journal_entries to check reconciliation
CREATE OR REPLACE FUNCTION public.delete_deposit_with_journal_entries(deposit_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  is_reconciled boolean;
BEGIN
  -- Check if deposit is reconciled
  SELECT reconciled INTO is_reconciled
  FROM public.deposits
  WHERE id = deposit_id_param;
  
  IF is_reconciled = true THEN
    RAISE EXCEPTION 'Cannot delete reconciled deposit. Please unreconile the deposit first.';
  END IF;

  -- Delete journal entry lines for deposit entries
  DELETE FROM public.journal_entry_lines 
  WHERE journal_entry_id IN (
    SELECT id FROM public.journal_entries 
    WHERE source_type = 'deposit' AND source_id = deposit_id_param
  );
  
  -- Delete journal entries for deposits
  DELETE FROM public.journal_entries 
  WHERE source_type = 'deposit' AND source_id = deposit_id_param;
  
  -- Delete deposit lines
  DELETE FROM public.deposit_lines 
  WHERE deposit_id = deposit_id_param;
  
  -- Finally delete the deposit
  DELETE FROM public.deposits 
  WHERE id = deposit_id_param;
  
  RETURN FOUND;
END;
$function$;

-- Update delete_check_with_journal_entries to check reconciliation
CREATE OR REPLACE FUNCTION public.delete_check_with_journal_entries(check_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  is_reconciled boolean;
BEGIN
  -- Check if check is reconciled
  SELECT reconciled INTO is_reconciled
  FROM public.checks
  WHERE id = check_id_param;
  
  IF is_reconciled = true THEN
    RAISE EXCEPTION 'Cannot delete reconciled check. Please unreconcile the check first.';
  END IF;

  -- Delete journal entry lines for check entries
  DELETE FROM public.journal_entry_lines 
  WHERE journal_entry_id IN (
    SELECT id FROM public.journal_entries 
    WHERE source_type = 'check' AND source_id = check_id_param
  );
  
  -- Delete journal entries for checks
  DELETE FROM public.journal_entries 
  WHERE source_type = 'check' AND source_id = check_id_param;
  
  -- Delete check lines
  DELETE FROM public.check_lines 
  WHERE check_id = check_id_param;
  
  -- Finally delete the check
  DELETE FROM public.checks 
  WHERE id = check_id_param;
  
  RETURN FOUND;
END;
$function$;

-- Update delete_credit_card_with_journal_entries to check reconciliation
CREATE OR REPLACE FUNCTION public.delete_credit_card_with_journal_entries(credit_card_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  is_reconciled boolean;
BEGIN
  -- Check if credit card transaction is reconciled
  SELECT reconciled INTO is_reconciled
  FROM public.credit_cards
  WHERE id = credit_card_id_param;
  
  IF is_reconciled = true THEN
    RAISE EXCEPTION 'Cannot delete reconciled credit card transaction. Please unreconcile the transaction first.';
  END IF;

  -- Delete journal entry lines for credit card entries
  DELETE FROM public.journal_entry_lines 
  WHERE journal_entry_id IN (
    SELECT id FROM public.journal_entries 
    WHERE source_type = 'credit_card' AND source_id = credit_card_id_param
  );
  
  -- Delete journal entries for credit cards
  DELETE FROM public.journal_entries 
  WHERE source_type = 'credit_card' AND source_id = credit_card_id_param;
  
  -- Delete credit card lines
  DELETE FROM public.credit_card_lines 
  WHERE credit_card_id = credit_card_id_param;
  
  -- Finally delete the credit card
  DELETE FROM public.credit_cards 
  WHERE id = credit_card_id_param;
  
  RETURN FOUND;
END;
$function$;

-- Update delete_bill_with_journal_entries to check reconciliation for bill payments
CREATE OR REPLACE FUNCTION public.delete_bill_with_journal_entries(bill_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  is_reconciled boolean;
BEGIN
  -- Check if any bill payment for this bill is reconciled
  SELECT EXISTS(
    SELECT 1 FROM public.bills 
    WHERE id = bill_id_param AND reconciled = true
  ) INTO is_reconciled;
  
  IF is_reconciled = true THEN
    RAISE EXCEPTION 'Cannot delete bill with reconciled payment. Please unreconcile the bill payment first.';
  END IF;

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

-- Add RLS policies to prevent deletion of reconciled items

CREATE POLICY "Cannot delete reconciled deposits"
ON public.deposits FOR DELETE
USING (reconciled = false);

CREATE POLICY "Cannot delete reconciled checks"
ON public.checks FOR DELETE
USING (reconciled = false);

CREATE POLICY "Cannot delete reconciled credit cards"
ON public.credit_cards FOR DELETE
USING (reconciled = false);

CREATE POLICY "Cannot delete bills with reconciled payments"
ON public.bills FOR DELETE
USING (reconciled = false OR reconciled IS NULL);