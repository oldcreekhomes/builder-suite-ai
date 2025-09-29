-- Fix missing project_id on journal entry lines from checks
-- This corrects the balance sheet imbalance by ensuring all journal entries 
-- from the same check transaction have consistent project_id values

-- Fix the specific line causing the $5,000 imbalance
UPDATE public.journal_entry_lines 
SET project_id = (
  SELECT DISTINCT cl.project_id 
  FROM public.journal_entries je
  JOIN public.checks c ON je.source_type = 'check' AND je.source_id = c.id
  JOIN public.check_lines cl ON cl.check_id = c.id
  WHERE je.id = journal_entry_lines.journal_entry_id
    AND cl.line_type = 'job_cost'
    AND cl.cost_code_id = journal_entry_lines.cost_code_id
  LIMIT 1
),
updated_at = NOW()
WHERE id = 'b4a79bd9-691d-49a7-8c86-ba9fc676b317'
  AND project_id IS NULL;

-- General fix: Update any other journal entry lines from checks that are missing project_id
-- when they should have one based on the corresponding check line
UPDATE public.journal_entry_lines 
SET project_id = check_project_mapping.project_id,
    updated_at = NOW()
FROM (
  SELECT DISTINCT 
    jel.id as line_id,
    cl.project_id
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON jel.journal_entry_id = je.id
  JOIN public.checks c ON je.source_type = 'check' AND je.source_id = c.id
  JOIN public.check_lines cl ON cl.check_id = c.id
  WHERE jel.project_id IS NULL
    AND cl.project_id IS NOT NULL
    AND (
      -- Match debit lines to job cost check lines by cost_code_id
      (jel.debit > 0 AND cl.line_type = 'job_cost' AND jel.cost_code_id = cl.cost_code_id)
      OR 
      -- Match credit lines to bank account debits (all lines from same check should have same project if any do)
      (jel.credit > 0)
    )
) AS check_project_mapping
WHERE journal_entry_lines.id = check_project_mapping.line_id;