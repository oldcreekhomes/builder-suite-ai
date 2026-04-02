
-- The Jan 27 credit JE (4b3dbb7c) currently has:
-- Line 1: Credit A/P $500
-- Line 2: Debit A/P $500 (was cash, we over-corrected)
-- 
-- Correct should be:
-- Line 1: Credit A/P $500 (keep)
-- Line 2: Debit Cash $350 (actual net credit offset against bank)
-- Line 3: Debit A/P $150 (internal credit offset)

-- Change line 2 back to Cash for $350
UPDATE journal_entry_lines
SET account_id = '27ed0c3a-be95-4367-aa21-1a2b51ea1585',  -- Atlantic Union Bank (1010)
    debit = 350.00,
    memo = 'Credit offset - net cash adjustment'
WHERE id = 'e6ec37ff-402f-4396-92c4-f9937423eb79';

-- Add line 3: Debit A/P $150 (internal offset)
INSERT INTO journal_entry_lines (
  journal_entry_id, line_number, account_id, debit, credit, memo, owner_id, project_id
)
SELECT 
  '4b3dbb7c-e701-407e-9756-170ca73e4a4c',
  3,
  'f1564c78-a440-403f-9734-9845a424681f',  -- A/P
  150.00,
  0,
  'Credit offset applied - OCH-02302',
  jel.owner_id,
  jel.project_id
FROM journal_entry_lines jel
WHERE jel.id = 'e6ec37ff-402f-4396-92c4-f9937423eb79'
LIMIT 1;
