-- Backfill missing owner_id and project_id on existing journal entry lines
-- This ensures all journal entries have proper owner_id and project_id for filtering

-- Update journal entry lines from bill posting to include owner_id and project_id
UPDATE public.journal_entry_lines 
SET owner_id = b.owner_id,
    project_id = b.project_id
FROM public.journal_entries je
JOIN public.bills b ON je.source_id = b.id AND je.source_type = 'bill'
WHERE journal_entry_lines.journal_entry_id = je.id 
AND journal_entry_lines.owner_id IS NULL;

-- Update journal entry lines from bill payments to include owner_id and project_id  
UPDATE public.journal_entry_lines 
SET owner_id = b.owner_id,
    project_id = b.project_id
FROM public.journal_entries je
JOIN public.bills b ON je.source_id = b.id AND je.source_type = 'bill_payment'
WHERE journal_entry_lines.journal_entry_id = je.id 
AND journal_entry_lines.owner_id IS NULL;