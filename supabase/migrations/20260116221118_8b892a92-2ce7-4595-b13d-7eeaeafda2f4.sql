-- Fix existing deposit job cost lines: change account from Equity (2905) to WIP (1430)
-- This ensures job cost deposit credits appear in the Job Costs report

UPDATE journal_entry_lines jel
SET account_id = wip.id
FROM journal_entries je,
     (SELECT id, owner_id FROM accounts WHERE code = '1430') wip,
     (SELECT id, owner_id FROM accounts WHERE code = '2905') equity
WHERE jel.journal_entry_id = je.id
  AND je.source_type = 'deposit'
  AND jel.cost_code_id IS NOT NULL
  AND jel.credit > 0
  AND jel.account_id = equity.id
  AND jel.owner_id = wip.owner_id
  AND jel.owner_id = equity.owner_id;