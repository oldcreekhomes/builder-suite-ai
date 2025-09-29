-- Fix historical check journal entries to properly debit WIP for job cost lines
-- This corrects past checks where job costs were incorrectly debiting cost code accounts

-- First, get the WIP account for each owner
WITH wip_accounts AS (
  SELECT owner_id, wip_account_id 
  FROM public.accounting_settings 
  WHERE wip_account_id IS NOT NULL
),
-- Find journal entry lines from checks that should be debiting WIP but aren't
job_cost_lines AS (
  SELECT 
    jel.id as line_id,
    jel.journal_entry_id,
    jel.owner_id,
    wa.wip_account_id,
    cl.cost_code_id,
    cl.project_id as check_line_project_id
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON jel.journal_entry_id = je.id
  JOIN public.checks c ON je.source_type = 'check' AND je.source_id = c.id
  JOIN public.check_lines cl ON cl.check_id = c.id
  JOIN wip_accounts wa ON wa.owner_id = jel.owner_id
  WHERE jel.debit > 0 
    AND jel.credit = 0
    AND jel.account_id != wa.wip_account_id  -- Not already using WIP account
    AND cl.line_type = 'job_cost'
    AND jel.cost_code_id = cl.cost_code_id  -- Match the cost code to identify job cost lines
)
-- Update the journal entry lines to use WIP account instead
UPDATE public.journal_entry_lines 
SET account_id = job_cost_lines.wip_account_id,
    updated_at = NOW()
FROM job_cost_lines
WHERE journal_entry_lines.id = job_cost_lines.line_id;