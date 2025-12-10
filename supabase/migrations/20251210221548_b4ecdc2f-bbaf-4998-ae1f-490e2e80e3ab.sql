-- Backfill lot_id from check_lines to journal_entry_lines
UPDATE journal_entry_lines 
SET lot_id = cl.lot_id
FROM check_lines cl
JOIN checks c ON cl.check_id = c.id
JOIN journal_entries je ON je.source_id = c.id AND je.source_type = 'check'
WHERE journal_entry_lines.journal_entry_id = je.id
  AND journal_entry_lines.cost_code_id = cl.cost_code_id
  AND journal_entry_lines.debit = cl.amount
  AND journal_entry_lines.lot_id IS NULL
  AND cl.lot_id IS NOT NULL;

-- Backfill lot_id from credit_card_lines to journal_entry_lines (purchases - debit side)
UPDATE journal_entry_lines
SET lot_id = ccl.lot_id
FROM credit_card_lines ccl
JOIN credit_cards cc ON ccl.credit_card_id = cc.id
JOIN journal_entries je ON je.source_id = cc.id AND je.source_type = 'credit_card'
WHERE journal_entry_lines.journal_entry_id = je.id
  AND journal_entry_lines.cost_code_id = ccl.cost_code_id
  AND journal_entry_lines.debit = ccl.amount
  AND journal_entry_lines.debit > 0
  AND journal_entry_lines.lot_id IS NULL
  AND ccl.lot_id IS NOT NULL;

-- Backfill lot_id from credit_card_lines to journal_entry_lines (refunds - credit side)
UPDATE journal_entry_lines
SET lot_id = ccl.lot_id
FROM credit_card_lines ccl
JOIN credit_cards cc ON ccl.credit_card_id = cc.id
JOIN journal_entries je ON je.source_id = cc.id AND je.source_type = 'credit_card'
WHERE journal_entry_lines.journal_entry_id = je.id
  AND journal_entry_lines.cost_code_id = ccl.cost_code_id
  AND journal_entry_lines.credit = ccl.amount
  AND journal_entry_lines.credit > 0
  AND journal_entry_lines.lot_id IS NULL
  AND ccl.lot_id IS NOT NULL;