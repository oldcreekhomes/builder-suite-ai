-- Fix invoice #48000482289 date errors
-- Bill date should be 2025-12-10 (was incorrectly 2026-12-10)
-- Due date should be 2026-01-15 (was incorrectly 2027-01-09)

-- Update the bill record
UPDATE bills 
SET bill_date = '2025-12-10',
    due_date = '2026-01-15',
    updated_at = NOW()
WHERE id = 'bbeca91f-24f6-45ca-8274-20175c3c03dd';

-- Update the associated journal entry to match the corrected bill date
UPDATE journal_entries 
SET entry_date = '2025-12-10',
    updated_at = NOW()
WHERE id = '2869b280-6262-4687-84a5-158e36b6ec43';