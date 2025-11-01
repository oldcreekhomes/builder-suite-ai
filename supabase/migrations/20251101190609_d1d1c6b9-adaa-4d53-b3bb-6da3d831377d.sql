-- Add can_close_books permission to user preferences
ALTER TABLE user_notification_preferences 
ADD COLUMN can_close_books BOOLEAN NOT NULL DEFAULT false;

-- Create accounting_periods table for project-specific period management
CREATE TABLE accounting_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  project_id UUID NOT NULL,
  period_end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'closed' CHECK (status IN ('open', 'closed')),
  closed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  closed_by UUID NOT NULL,
  reopened_at TIMESTAMP WITH TIME ZONE,
  reopened_by UUID,
  reopen_reason TEXT,
  closure_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, period_end_date)
);

-- Index for performance
CREATE INDEX idx_accounting_periods_project_status 
ON accounting_periods(project_id, status, period_end_date);

-- Function to check if a period is closed
CREATE OR REPLACE FUNCTION is_period_closed(
  check_date DATE,
  check_project_id UUID,
  check_owner_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM accounting_periods
    WHERE owner_id = check_owner_id
      AND project_id = check_project_id
      AND status = 'closed'
      AND period_end_date >= check_date
    LIMIT 1
  );
$$;

-- Function to validate reconciliations before close
CREATE OR REPLACE FUNCTION can_close_period(
  check_project_id UUID,
  check_date DATE
)
RETURNS TABLE(can_close BOOLEAN, reason TEXT)
LANGUAGE PLPGSQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  incomplete_recons INTEGER;
BEGIN
  SELECT COUNT(*) INTO incomplete_recons
  FROM bank_reconciliations
  WHERE project_id = check_project_id
    AND statement_date <= check_date
    AND status != 'completed';
  
  IF incomplete_recons > 0 THEN
    RETURN QUERY SELECT FALSE, 
      'Cannot close books: ' || incomplete_recons || 
      ' reconciliation(s) are not completed for this period.';
  ELSE
    RETURN QUERY SELECT TRUE, 'All reconciliations completed.';
  END IF;
END;
$$;

-- Enable RLS on accounting_periods
ALTER TABLE accounting_periods ENABLE ROW LEVEL SECURITY;

-- RLS: SELECT - Owner and confirmed employees can view
CREATE POLICY "Accounting periods visible to owner and employees"
ON accounting_periods FOR SELECT
USING (
  owner_id = auth.uid() 
  OR owner_id IN (
    SELECT home_builder_id FROM users 
    WHERE id = auth.uid() 
    AND confirmed = true 
    AND role IN ('employee', 'accountant')
  )
);

-- RLS: INSERT - Only users with can_close_books permission or owner
CREATE POLICY "Close books permission required for insert"
ON accounting_periods FOR INSERT
WITH CHECK (
  (owner_id = auth.uid() AND has_role(auth.uid(), 'owner'))
  OR (
    owner_id IN (
      SELECT u.home_builder_id FROM users u
      JOIN user_notification_preferences p ON p.user_id = u.id
      WHERE u.id = auth.uid() 
      AND u.confirmed = true
      AND p.can_close_books = true
    )
  )
);

-- RLS: UPDATE - Only users with can_close_books permission or owner
CREATE POLICY "Close books permission required for update"
ON accounting_periods FOR UPDATE
USING (
  (owner_id = auth.uid() AND has_role(auth.uid(), 'owner'))
  OR (
    owner_id IN (
      SELECT u.home_builder_id FROM users u
      JOIN user_notification_preferences p ON p.user_id = u.id
      WHERE u.id = auth.uid() 
      AND u.confirmed = true
      AND p.can_close_books = true
    )
  )
);

-- RLS: DELETE - Only owner can delete
CREATE POLICY "Only owner can delete accounting periods"
ON accounting_periods FOR DELETE
USING (owner_id = auth.uid() AND has_role(auth.uid(), 'owner'));

-- Add RLS policies to transaction tables to prevent updates/deletes in closed periods

-- Bills
CREATE POLICY "Bills in closed periods cannot be updated"
ON bills FOR UPDATE
USING (
  project_id IS NULL OR NOT is_period_closed(bill_date, project_id, owner_id)
);

CREATE POLICY "Bills in closed periods cannot be deleted"
ON bills FOR DELETE
USING (
  project_id IS NULL OR NOT is_period_closed(bill_date, project_id, owner_id)
);

-- Checks
CREATE POLICY "Checks in closed periods cannot be updated"
ON checks FOR UPDATE
USING (
  project_id IS NULL OR NOT is_period_closed(check_date, project_id, owner_id)
);

CREATE POLICY "Checks in closed periods cannot be deleted"
ON checks FOR DELETE
USING (
  project_id IS NULL OR NOT is_period_closed(check_date, project_id, owner_id)
);

-- Deposits
CREATE POLICY "Deposits in closed periods cannot be updated"
ON deposits FOR UPDATE
USING (
  project_id IS NULL OR NOT is_period_closed(deposit_date, project_id, owner_id)
);

CREATE POLICY "Deposits in closed periods cannot be deleted"
ON deposits FOR DELETE
USING (
  project_id IS NULL OR NOT is_period_closed(deposit_date, project_id, owner_id)
);

-- Journal Entries - Check if related to a bill/check/deposit in a closed period
CREATE POLICY "Journal entries in closed periods cannot be updated"
ON journal_entries FOR UPDATE
USING (
  (source_type = 'manual' AND NOT EXISTS (
    SELECT 1 FROM journal_entry_lines jel
    WHERE jel.journal_entry_id = journal_entries.id
    AND jel.project_id IS NOT NULL
    AND is_period_closed(journal_entries.entry_date, jel.project_id, journal_entries.owner_id)
  ))
  OR
  (source_type = 'bill' AND (
    SELECT b.project_id IS NULL OR NOT is_period_closed(b.bill_date, b.project_id, b.owner_id)
    FROM bills b WHERE b.id = journal_entries.source_id
  ))
  OR
  (source_type = 'bill_payment' AND (
    SELECT b.project_id IS NULL OR NOT is_period_closed(journal_entries.entry_date, b.project_id, b.owner_id)
    FROM bills b WHERE b.id = journal_entries.source_id
  ))
  OR
  (source_type = 'check' AND (
    SELECT c.project_id IS NULL OR NOT is_period_closed(c.check_date, c.project_id, c.owner_id)
    FROM checks c WHERE c.id = journal_entries.source_id
  ))
  OR
  (source_type = 'deposit' AND (
    SELECT d.project_id IS NULL OR NOT is_period_closed(d.deposit_date, d.project_id, d.owner_id)
    FROM deposits d WHERE d.id = journal_entries.source_id
  ))
  OR
  (source_type = 'credit_card' AND (
    SELECT cc.project_id IS NULL OR NOT is_period_closed(cc.transaction_date, cc.project_id, cc.owner_id)
    FROM credit_cards cc WHERE cc.id = journal_entries.source_id
  ))
);

CREATE POLICY "Journal entries in closed periods cannot be deleted"
ON journal_entries FOR DELETE
USING (
  (source_type = 'manual' AND NOT EXISTS (
    SELECT 1 FROM journal_entry_lines jel
    WHERE jel.journal_entry_id = journal_entries.id
    AND jel.project_id IS NOT NULL
    AND is_period_closed(journal_entries.entry_date, jel.project_id, journal_entries.owner_id)
  ))
  OR
  (source_type = 'bill' AND (
    SELECT b.project_id IS NULL OR NOT is_period_closed(b.bill_date, b.project_id, b.owner_id)
    FROM bills b WHERE b.id = journal_entries.source_id
  ))
  OR
  (source_type = 'bill_payment' AND (
    SELECT b.project_id IS NULL OR NOT is_period_closed(journal_entries.entry_date, b.project_id, b.owner_id)
    FROM bills b WHERE b.id = journal_entries.source_id
  ))
  OR
  (source_type = 'check' AND (
    SELECT c.project_id IS NULL OR NOT is_period_closed(c.check_date, c.project_id, c.owner_id)
    FROM checks c WHERE c.id = journal_entries.source_id
  ))
  OR
  (source_type = 'deposit' AND (
    SELECT d.project_id IS NULL OR NOT is_period_closed(d.deposit_date, d.project_id, d.owner_id)
    FROM deposits d WHERE d.id = journal_entries.source_id
  ))
  OR
  (source_type = 'credit_card' AND (
    SELECT cc.project_id IS NULL OR NOT is_period_closed(cc.transaction_date, cc.project_id, cc.owner_id)
    FROM credit_cards cc WHERE cc.id = journal_entries.source_id
  ))
);

-- Credit Cards
CREATE POLICY "Credit cards in closed periods cannot be updated"
ON credit_cards FOR UPDATE
USING (
  project_id IS NULL OR NOT is_period_closed(transaction_date, project_id, owner_id)
);

CREATE POLICY "Credit cards in closed periods cannot be deleted"
ON credit_cards FOR DELETE
USING (
  project_id IS NULL OR NOT is_period_closed(transaction_date, project_id, owner_id)
);