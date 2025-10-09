-- Create RPC function for deleting checks with all related data
CREATE OR REPLACE FUNCTION public.delete_check_with_journal_entries(check_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
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
$$;

-- Create RPC function for deleting deposits with all related data
CREATE OR REPLACE FUNCTION public.delete_deposit_with_journal_entries(deposit_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
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
$$;

-- Create RPC function for deleting manual journal entries with all related data
CREATE OR REPLACE FUNCTION public.delete_manual_journal_entry(journal_entry_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Delete journal entry lines
  DELETE FROM public.journal_entry_lines 
  WHERE journal_entry_id = journal_entry_id_param;
  
  -- Delete the journal entry (only if it's a manual entry)
  DELETE FROM public.journal_entries 
  WHERE id = journal_entry_id_param AND source_type = 'manual';
  
  RETURN FOUND;
END;
$$;