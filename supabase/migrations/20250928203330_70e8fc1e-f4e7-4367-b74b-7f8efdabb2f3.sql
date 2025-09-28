-- Backfill missing project_id on ALL existing journal entry lines from bills
-- This ensures all journal entries have proper project_id for balance sheet filtering

-- Update journal entry lines from bill posting to include missing project_id
-- Update ALL lines where project_id is NULL, regardless of owner_id
UPDATE public.journal_entry_lines 
SET project_id = b.project_id
FROM public.journal_entries je
JOIN public.bills b ON je.source_id = b.id AND je.source_type = 'bill'
WHERE journal_entry_lines.journal_entry_id = je.id 
AND journal_entry_lines.project_id IS NULL
AND b.project_id IS NOT NULL;

-- Update journal entry lines from bill payments to include missing project_id  
UPDATE public.journal_entry_lines 
SET project_id = b.project_id
FROM public.journal_entries je
JOIN public.bills b ON je.source_id = b.id AND je.source_type = 'bill_payment'
WHERE journal_entry_lines.journal_entry_id = je.id 
AND journal_entry_lines.project_id IS NULL
AND b.project_id IS NOT NULL;

-- Also backfill any remaining missing owner_id values
UPDATE public.journal_entry_lines 
SET owner_id = b.owner_id
FROM public.journal_entries je
JOIN public.bills b ON je.source_id = b.id AND je.source_type IN ('bill', 'bill_payment')
WHERE journal_entry_lines.journal_entry_id = je.id 
AND journal_entry_lines.owner_id IS NULL;

-- Add trigger to ensure future journal entry lines have owner_id set automatically
CREATE OR REPLACE FUNCTION public.ensure_journal_line_owner()
RETURNS TRIGGER AS $$
BEGIN
  -- If owner_id is NULL, get it from the journal entry
  IF NEW.owner_id IS NULL THEN
    SELECT je.owner_id INTO NEW.owner_id
    FROM public.journal_entries je
    WHERE je.id = NEW.journal_entry_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Create trigger for automatic owner_id setting
DROP TRIGGER IF EXISTS ensure_journal_line_owner_trigger ON public.journal_entry_lines;
CREATE TRIGGER ensure_journal_line_owner_trigger
  BEFORE INSERT ON public.journal_entry_lines
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_journal_line_owner();