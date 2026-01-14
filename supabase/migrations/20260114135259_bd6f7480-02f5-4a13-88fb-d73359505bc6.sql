-- Drop all existing owner-based RLS policies on bank_reconciliations
DROP POLICY IF EXISTS "Bank reconciliations visible to owner and confirmed employees" ON public.bank_reconciliations;
DROP POLICY IF EXISTS "Company users can view bank reconciliations" ON public.bank_reconciliations;
DROP POLICY IF EXISTS "Bank reconciliations insert limited to owner and confirmed empl" ON public.bank_reconciliations;
DROP POLICY IF EXISTS "Company users can insert bank reconciliations" ON public.bank_reconciliations;
DROP POLICY IF EXISTS "Bank reconciliations update limited to owner and confirmed empl" ON public.bank_reconciliations;
DROP POLICY IF EXISTS "Company users can update bank reconciliations" ON public.bank_reconciliations;
DROP POLICY IF EXISTS "Bank reconciliations delete limited to owner and confirmed empl" ON public.bank_reconciliations;
DROP POLICY IF EXISTS "Company users can delete bank reconciliations" ON public.bank_reconciliations;

-- Create simple policies that allow all authenticated users full access
-- Access control is handled at the application level

CREATE POLICY "Authenticated users can view bank reconciliations"
ON public.bank_reconciliations
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert bank reconciliations"
ON public.bank_reconciliations
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update bank reconciliations"
ON public.bank_reconciliations
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete bank reconciliations"
ON public.bank_reconciliations
FOR DELETE
TO authenticated
USING (true);