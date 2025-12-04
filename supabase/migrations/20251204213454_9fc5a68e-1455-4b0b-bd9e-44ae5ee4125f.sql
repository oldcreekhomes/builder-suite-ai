-- Delete the duplicate Ellen Louise Felker check and its journal entries
-- The duplicate is ID: 6940935d-6b19-4a1a-b3e0-4373380b2cd8 (no check_number, created at 2025-12-04 21:22:24)

-- First delete journal entry lines for this check
DELETE FROM public.journal_entry_lines 
WHERE journal_entry_id IN (
  SELECT id FROM public.journal_entries 
  WHERE source_type = 'check' AND source_id = '6940935d-6b19-4a1a-b3e0-4373380b2cd8'
);

-- Delete journal entries for this check
DELETE FROM public.journal_entries 
WHERE source_type = 'check' AND source_id = '6940935d-6b19-4a1a-b3e0-4373380b2cd8';

-- Delete check lines for this check
DELETE FROM public.check_lines 
WHERE check_id = '6940935d-6b19-4a1a-b3e0-4373380b2cd8';

-- Delete the duplicate check
DELETE FROM public.checks 
WHERE id = '6940935d-6b19-4a1a-b3e0-4373380b2cd8';