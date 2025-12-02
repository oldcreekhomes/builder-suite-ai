-- Fix RLS policies for bank_reconciliations to allow ALL company users full access
-- Per user: "ALL EMPLOYEES HAVE ALL ACCESS, INCLUDING THE OWNER TO THE ACCOUNTING SYSTEM"

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own bank reconciliations" ON bank_reconciliations;
DROP POLICY IF EXISTS "Users can insert their own bank reconciliations" ON bank_reconciliations;
DROP POLICY IF EXISTS "Users can update their own bank reconciliations" ON bank_reconciliations;
DROP POLICY IF EXISTS "Users can delete their own bank reconciliations" ON bank_reconciliations;

-- Create new policies that allow all company users (owner + employees + accountants) to access all data
-- Pattern: owner sees their own data + employee data, employees see owner data + other employee data

CREATE POLICY "Company users can view bank reconciliations"
ON bank_reconciliations FOR SELECT
USING (
  -- User is the owner
  owner_id = auth.uid()
  OR
  -- User is an employee/accountant viewing their owner's data
  owner_id IN (SELECT home_builder_id FROM users WHERE id = auth.uid() AND confirmed = true)
  OR
  -- Owner viewing their employees' data
  owner_id IN (SELECT id FROM users WHERE home_builder_id = auth.uid())
);

CREATE POLICY "Company users can insert bank reconciliations"
ON bank_reconciliations FOR INSERT
WITH CHECK (
  owner_id = auth.uid()
  OR
  owner_id IN (SELECT home_builder_id FROM users WHERE id = auth.uid() AND confirmed = true)
  OR
  owner_id IN (SELECT id FROM users WHERE home_builder_id = auth.uid())
);

CREATE POLICY "Company users can update bank reconciliations"
ON bank_reconciliations FOR UPDATE
USING (
  owner_id = auth.uid()
  OR
  owner_id IN (SELECT home_builder_id FROM users WHERE id = auth.uid() AND confirmed = true)
  OR
  owner_id IN (SELECT id FROM users WHERE home_builder_id = auth.uid())
);

CREATE POLICY "Company users can delete bank reconciliations"
ON bank_reconciliations FOR DELETE
USING (
  owner_id = auth.uid()
  OR
  owner_id IN (SELECT home_builder_id FROM users WHERE id = auth.uid() AND confirmed = true)
  OR
  owner_id IN (SELECT id FROM users WHERE home_builder_id = auth.uid())
);