-- Fix unbalanced journal entry for check to John H. Morgal Plumbing
-- The check credited the bank account for $5000 but has no corresponding debit entries
-- We'll add a debit to Work in Progress account to balance the entry

INSERT INTO public.journal_entry_lines (
  journal_entry_id,
  owner_id,
  line_number,
  account_id,
  debit,
  credit,
  memo
) VALUES (
  '5fdccdab-3d9f-419a-adf9-4a444df3c331',  -- The journal entry ID for the check
  '2653aba8-d154-4301-99bf-77d559492e19',  -- Owner ID from accounting settings
  2,  -- Line number 2 (line 1 is the bank credit)
  'c9a35605-2470-4d83-989f-32c51f4d7ec4',  -- WIP account ID from accounting settings
  5000.00,  -- Debit amount
  0.00,     -- Credit amount
  'Check 1001 to John H. Morgal Plumbing - WIP allocation (corrective entry)'
);