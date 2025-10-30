-- Phase 1: Add Reversing Entry Method Support to All Transaction Tables
-- Fixed version: Add 'reversed' to enums first, then create columns

-- =====================================================
-- 0. ADD 'reversed' TO STATUS ENUMS
-- =====================================================

-- Add 'reversed' to bill_status enum
ALTER TYPE bill_status ADD VALUE IF NOT EXISTS 'reversed';

-- Note: deposits.status and credit_cards.status are text fields, not enums
-- So we don't need to modify enums for those

-- =====================================================
-- 1. BILLS TABLE
-- =====================================================

ALTER TABLE bills
ADD COLUMN reversed_by_id UUID REFERENCES bills(id) ON DELETE SET NULL,
ADD COLUMN reverses_id UUID REFERENCES bills(id) ON DELETE SET NULL,
ADD COLUMN is_reversal BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN correction_reason TEXT,
ADD COLUMN reversed_at TIMESTAMPTZ;

COMMENT ON COLUMN bills.is_reversal IS 'True if this entry reverses a previous entry for audit trail purposes';
COMMENT ON COLUMN bills.reversed_by_id IS 'ID of the bill that reversed this one (set when this is corrected)';
COMMENT ON COLUMN bills.reverses_id IS 'ID of the bill this entry reverses (set when this is a reversal entry)';
COMMENT ON COLUMN bills.correction_reason IS 'Explanation for why this correction was made';
COMMENT ON COLUMN bills.reversed_at IS 'Timestamp when this bill was reversed';

CREATE INDEX idx_bills_active ON bills (owner_id, bill_date)
WHERE reversed_at IS NULL AND is_reversal = FALSE;

-- =====================================================
-- 2. BILL_LINES TABLE
-- =====================================================

ALTER TABLE bill_lines
ADD COLUMN is_reversal BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN reverses_line_id UUID REFERENCES bill_lines(id) ON DELETE SET NULL;

COMMENT ON COLUMN bill_lines.is_reversal IS 'True if this line item is part of a reversing entry';
COMMENT ON COLUMN bill_lines.reverses_line_id IS 'ID of the original line this reverses';

-- =====================================================
-- 3. CHECKS TABLE
-- =====================================================

ALTER TABLE checks
ADD COLUMN reversed_by_id UUID REFERENCES checks(id) ON DELETE SET NULL,
ADD COLUMN reverses_id UUID REFERENCES checks(id) ON DELETE SET NULL,
ADD COLUMN is_reversal BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN correction_reason TEXT,
ADD COLUMN reversed_at TIMESTAMPTZ;

COMMENT ON COLUMN checks.is_reversal IS 'True if this entry reverses a previous entry for audit trail purposes';
COMMENT ON COLUMN checks.reversed_by_id IS 'ID of the check that reversed this one (set when this is corrected)';
COMMENT ON COLUMN checks.reverses_id IS 'ID of the check this entry reverses (set when this is a reversal entry)';
COMMENT ON COLUMN checks.correction_reason IS 'Explanation for why this correction was made';
COMMENT ON COLUMN checks.reversed_at IS 'Timestamp when this check was reversed';

CREATE INDEX idx_checks_active ON checks (owner_id, check_date)
WHERE reversed_at IS NULL AND is_reversal = FALSE;

-- =====================================================
-- 4. CHECK_LINES TABLE
-- =====================================================

ALTER TABLE check_lines
ADD COLUMN is_reversal BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN reverses_line_id UUID REFERENCES check_lines(id) ON DELETE SET NULL;

COMMENT ON COLUMN check_lines.is_reversal IS 'True if this line item is part of a reversing entry';
COMMENT ON COLUMN check_lines.reverses_line_id IS 'ID of the original line this reverses';

-- =====================================================
-- 5. DEPOSITS TABLE
-- =====================================================

ALTER TABLE deposits
ADD COLUMN reversed_by_id UUID REFERENCES deposits(id) ON DELETE SET NULL,
ADD COLUMN reverses_id UUID REFERENCES deposits(id) ON DELETE SET NULL,
ADD COLUMN is_reversal BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN correction_reason TEXT,
ADD COLUMN reversed_at TIMESTAMPTZ;

COMMENT ON COLUMN deposits.is_reversal IS 'True if this entry reverses a previous entry for audit trail purposes';
COMMENT ON COLUMN deposits.reversed_by_id IS 'ID of the deposit that reversed this one (set when this is corrected)';
COMMENT ON COLUMN deposits.reverses_id IS 'ID of the deposit this entry reverses (set when this is a reversal entry)';
COMMENT ON COLUMN deposits.correction_reason IS 'Explanation for why this correction was made';
COMMENT ON COLUMN deposits.reversed_at IS 'Timestamp when this deposit was reversed';

CREATE INDEX idx_deposits_active ON deposits (owner_id, deposit_date)
WHERE reversed_at IS NULL AND is_reversal = FALSE;

-- =====================================================
-- 6. DEPOSIT_LINES TABLE
-- =====================================================

ALTER TABLE deposit_lines
ADD COLUMN is_reversal BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN reverses_line_id UUID REFERENCES deposit_lines(id) ON DELETE SET NULL;

COMMENT ON COLUMN deposit_lines.is_reversal IS 'True if this line item is part of a reversing entry';
COMMENT ON COLUMN deposit_lines.reverses_line_id IS 'ID of the original line this reverses';

-- =====================================================
-- 7. CREDIT_CARDS TABLE
-- =====================================================

ALTER TABLE credit_cards
ADD COLUMN reversed_by_id UUID REFERENCES credit_cards(id) ON DELETE SET NULL,
ADD COLUMN reverses_id UUID REFERENCES credit_cards(id) ON DELETE SET NULL,
ADD COLUMN is_reversal BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN correction_reason TEXT,
ADD COLUMN reversed_at TIMESTAMPTZ;

COMMENT ON COLUMN credit_cards.is_reversal IS 'True if this entry reverses a previous entry for audit trail purposes';
COMMENT ON COLUMN credit_cards.reversed_by_id IS 'ID of the credit card entry that reversed this one (set when this is corrected)';
COMMENT ON COLUMN credit_cards.reverses_id IS 'ID of the credit card entry this reverses (set when this is a reversal entry)';
COMMENT ON COLUMN credit_cards.correction_reason IS 'Explanation for why this correction was made';
COMMENT ON COLUMN credit_cards.reversed_at IS 'Timestamp when this credit card entry was reversed';

CREATE INDEX idx_credit_cards_active ON credit_cards (owner_id, transaction_date)
WHERE reversed_at IS NULL AND is_reversal = FALSE;

-- =====================================================
-- 8. CREDIT_CARD_LINES TABLE
-- =====================================================

ALTER TABLE credit_card_lines
ADD COLUMN is_reversal BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN reverses_line_id UUID REFERENCES credit_card_lines(id) ON DELETE SET NULL;

COMMENT ON COLUMN credit_card_lines.is_reversal IS 'True if this line item is part of a reversing entry';
COMMENT ON COLUMN credit_card_lines.reverses_line_id IS 'ID of the original line this reverses';

-- =====================================================
-- 9. JOURNAL_ENTRIES TABLE
-- =====================================================

ALTER TABLE journal_entries
ADD COLUMN reversed_by_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
ADD COLUMN reverses_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
ADD COLUMN is_reversal BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN correction_reason TEXT,
ADD COLUMN reversed_at TIMESTAMPTZ;

COMMENT ON COLUMN journal_entries.is_reversal IS 'True if this entry reverses a previous entry for audit trail purposes';
COMMENT ON COLUMN journal_entries.reversed_by_id IS 'ID of the journal entry that reversed this one (set when this is corrected)';
COMMENT ON COLUMN journal_entries.reverses_id IS 'ID of the journal entry this reverses (set when this is a reversal entry)';
COMMENT ON COLUMN journal_entries.correction_reason IS 'Explanation for why this correction was made';
COMMENT ON COLUMN journal_entries.reversed_at IS 'Timestamp when this journal entry was reversed';

CREATE INDEX idx_journal_entries_active ON journal_entries (owner_id, entry_date)
WHERE reversed_at IS NULL AND is_reversal = FALSE;

-- =====================================================
-- 10. JOURNAL_ENTRY_LINES TABLE
-- =====================================================

ALTER TABLE journal_entry_lines
ADD COLUMN is_reversal BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN reverses_line_id UUID REFERENCES journal_entry_lines(id) ON DELETE SET NULL;

COMMENT ON COLUMN journal_entry_lines.is_reversal IS 'True if this line item is part of a reversing entry';
COMMENT ON COLUMN journal_entry_lines.reverses_line_id IS 'ID of the original line this reverses';

-- =====================================================
-- SUMMARY
-- =====================================================
-- This migration adds complete support for the Reversing Entry Method
-- across all transaction types (bills, checks, deposits, credit cards, 
-- and manual journal entries).
--
-- Key features:
-- - 'reversed' status added to bill_status enum
-- - All original transactions can be marked with reversed_at timestamp
-- - Reversing entries link back to the original via reverses_id
-- - Corrected entries tracked via reversed_by_id
-- - Complete audit trail maintained
-- - Performance indexes for active transactions (non-reversed, non-reversal)
-- - Backward compatible (all columns nullable except boolean flags)