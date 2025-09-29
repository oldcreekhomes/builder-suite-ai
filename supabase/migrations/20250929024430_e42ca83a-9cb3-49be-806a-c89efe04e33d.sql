-- Fix missing project_id on WIP account journal entry lines from checks
-- This addresses the $5,000 balance sheet imbalance by ensuring WIP debits 
-- have the correct project_id to match their corresponding bank credits

-- Update WIP debit lines that are missing project_id when the check has a project_id
UPDATE public.journal_entry_lines 
SET project_id = c.project_id,
    updated_at = NOW()
FROM public.journal_entries je
JOIN public.checks c ON je.source_type = 'check' AND je.source_id = c.id
JOIN public.accounting_settings acs ON acs.owner_id = c.owner_id
WHERE journal_entry_lines.journal_entry_id = je.id
  AND journal_entry_lines.project_id IS NULL
  AND journal_entry_lines.account_id = acs.wip_account_id
  AND journal_entry_lines.debit > 0
  AND c.project_id IS NOT NULL;