-- Backfill project_id for existing bank credit journal entry lines from checks
-- This ensures existing check journal entries show up properly in project balance sheets

UPDATE public.journal_entry_lines 
SET project_id = c.project_id
FROM public.journal_entries je
JOIN public.checks c ON je.source_type = 'check' AND je.source_id = c.id
WHERE journal_entry_lines.journal_entry_id = je.id
  AND journal_entry_lines.credit > 0
  AND journal_entry_lines.debit = 0
  AND c.project_id IS NOT NULL
  AND journal_entry_lines.project_id IS NULL;