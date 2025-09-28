-- Step 1: Clean up orphaned journal entries (entries where the source bill no longer exists)
DELETE FROM public.journal_entry_lines 
WHERE journal_entry_id IN (
  SELECT je.id 
  FROM public.journal_entries je 
  LEFT JOIN public.bills b ON je.source_id = b.id AND je.source_type = 'bill'
  WHERE je.source_type = 'bill' AND b.id IS NULL
);

DELETE FROM public.journal_entries 
WHERE source_type = 'bill' 
AND source_id NOT IN (SELECT id FROM public.bills);

-- Step 2: Create a function to delete bills with cascading journal entry deletion
CREATE OR REPLACE FUNCTION public.delete_bill_with_journal_entries(bill_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Delete journal entry lines first
  DELETE FROM public.journal_entry_lines 
  WHERE journal_entry_id IN (
    SELECT id FROM public.journal_entries 
    WHERE source_type = 'bill' AND source_id = bill_id_param
  );
  
  -- Delete journal entries
  DELETE FROM public.journal_entries 
  WHERE source_type = 'bill' AND source_id = bill_id_param;
  
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
$$;