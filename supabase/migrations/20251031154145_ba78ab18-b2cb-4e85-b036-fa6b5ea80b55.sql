-- Remove the overly restrictive unique constraint on journal_entries
-- This allows multiple journal entries for the same source (e.g., multiple partial bill payments)
-- Each payment will have its own journal entry with the correct date and amount for proper audit trail
ALTER TABLE public.journal_entries 
DROP CONSTRAINT IF EXISTS journal_entries_source_type_source_id_key;