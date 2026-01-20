-- CRITICAL SECURITY FIX: Replace broken RLS policies that allowed cross-company data access
-- The old policies only checked if a user had ANY company, not if they belonged to THIS company's data

-- =====================================================
-- FIX: projects table
-- =====================================================
DROP POLICY IF EXISTS "Company users can access all company data" ON public.projects;

CREATE POLICY "Users can access their company projects" 
ON public.projects 
FOR ALL 
USING (
  owner_id = auth.uid() 
  OR 
  owner_id IN (
    SELECT home_builder_id 
    FROM public.users 
    WHERE id = auth.uid() AND confirmed = true
  )
)
WITH CHECK (
  owner_id = auth.uid() 
  OR 
  owner_id IN (
    SELECT home_builder_id 
    FROM public.users 
    WHERE id = auth.uid() AND confirmed = true
  )
);

-- =====================================================
-- FIX: project_photos table
-- =====================================================
DROP POLICY IF EXISTS "Company users can access all company data" ON public.project_photos;

CREATE POLICY "Users can access their company project photos" 
ON public.project_photos 
FOR ALL 
USING (
  project_id IN (
    SELECT id FROM public.projects
    WHERE owner_id = auth.uid() 
    OR owner_id IN (
      SELECT home_builder_id 
      FROM public.users 
      WHERE id = auth.uid() AND confirmed = true
    )
  )
)
WITH CHECK (
  project_id IN (
    SELECT id FROM public.projects
    WHERE owner_id = auth.uid() 
    OR owner_id IN (
      SELECT home_builder_id 
      FROM public.users 
      WHERE id = auth.uid() AND confirmed = true
    )
  )
);

-- =====================================================
-- FIX: project_lots table
-- =====================================================
DROP POLICY IF EXISTS "Company users can access all company data" ON public.project_lots;

CREATE POLICY "Users can access their company project lots" 
ON public.project_lots 
FOR ALL 
USING (
  project_id IN (
    SELECT id FROM public.projects
    WHERE owner_id = auth.uid() 
    OR owner_id IN (
      SELECT home_builder_id 
      FROM public.users 
      WHERE id = auth.uid() AND confirmed = true
    )
  )
)
WITH CHECK (
  project_id IN (
    SELECT id FROM public.projects
    WHERE owner_id = auth.uid() 
    OR owner_id IN (
      SELECT home_builder_id 
      FROM public.users 
      WHERE id = auth.uid() AND confirmed = true
    )
  )
);

-- =====================================================
-- FIX: project_budgets table
-- =====================================================
DROP POLICY IF EXISTS "Company users can access all company data" ON public.project_budgets;

CREATE POLICY "Users can access their company project budgets" 
ON public.project_budgets 
FOR ALL 
USING (
  project_id IN (
    SELECT id FROM public.projects
    WHERE owner_id = auth.uid() 
    OR owner_id IN (
      SELECT home_builder_id 
      FROM public.users 
      WHERE id = auth.uid() AND confirmed = true
    )
  )
)
WITH CHECK (
  project_id IN (
    SELECT id FROM public.projects
    WHERE owner_id = auth.uid() 
    OR owner_id IN (
      SELECT home_builder_id 
      FROM public.users 
      WHERE id = auth.uid() AND confirmed = true
    )
  )
);

-- =====================================================
-- FIX: project_files table (if exists)
-- =====================================================
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'project_files') THEN
    DROP POLICY IF EXISTS "Company users can access all company data" ON public.project_files;
    
    EXECUTE 'CREATE POLICY "Users can access their company project files" 
    ON public.project_files 
    FOR ALL 
    USING (
      project_id IN (
        SELECT id FROM public.projects
        WHERE owner_id = auth.uid() 
        OR owner_id IN (
          SELECT home_builder_id 
          FROM public.users 
          WHERE id = auth.uid() AND confirmed = true
        )
      )
    )
    WITH CHECK (
      project_id IN (
        SELECT id FROM public.projects
        WHERE owner_id = auth.uid() 
        OR owner_id IN (
          SELECT home_builder_id 
          FROM public.users 
          WHERE id = auth.uid() AND confirmed = true
        )
      )
    )';
  END IF;
END $$;

-- =====================================================
-- FIX: companies table (vendor/subcontractor data)
-- =====================================================
DROP POLICY IF EXISTS "Company users can access all company data" ON public.companies;

CREATE POLICY "Users can access their company vendors" 
ON public.companies 
FOR ALL 
USING (
  home_builder_id = auth.uid() 
  OR 
  home_builder_id IN (
    SELECT home_builder_id 
    FROM public.users 
    WHERE id = auth.uid() AND confirmed = true
  )
)
WITH CHECK (
  home_builder_id = auth.uid() 
  OR 
  home_builder_id IN (
    SELECT home_builder_id 
    FROM public.users 
    WHERE id = auth.uid() AND confirmed = true
  )
);

-- =====================================================
-- FIX: company_representatives table
-- =====================================================
DROP POLICY IF EXISTS "Company users can access all company data" ON public.company_representatives;

CREATE POLICY "Users can access their company representatives" 
ON public.company_representatives 
FOR ALL 
USING (
  home_builder_id = auth.uid() 
  OR 
  home_builder_id IN (
    SELECT home_builder_id 
    FROM public.users 
    WHERE id = auth.uid() AND confirmed = true
  )
)
WITH CHECK (
  home_builder_id = auth.uid() 
  OR 
  home_builder_id IN (
    SELECT home_builder_id 
    FROM public.users 
    WHERE id = auth.uid() AND confirmed = true
  )
);

-- =====================================================
-- FIX: company_insurances table
-- =====================================================
DROP POLICY IF EXISTS "Company users can access all company data" ON public.company_insurances;

CREATE POLICY "Users can access their company insurances" 
ON public.company_insurances 
FOR ALL 
USING (
  home_builder_id = auth.uid() 
  OR 
  home_builder_id IN (
    SELECT home_builder_id 
    FROM public.users 
    WHERE id = auth.uid() AND confirmed = true
  )
)
WITH CHECK (
  home_builder_id = auth.uid() 
  OR 
  home_builder_id IN (
    SELECT home_builder_id 
    FROM public.users 
    WHERE id = auth.uid() AND confirmed = true
  )
);

-- =====================================================
-- FIX: cost_codes table
-- =====================================================
DROP POLICY IF EXISTS "Company users can access all company data" ON public.cost_codes;

CREATE POLICY "Users can access their company cost codes" 
ON public.cost_codes 
FOR ALL 
USING (
  owner_id = auth.uid() 
  OR 
  owner_id IN (
    SELECT home_builder_id 
    FROM public.users 
    WHERE id = auth.uid() AND confirmed = true
  )
)
WITH CHECK (
  owner_id = auth.uid() 
  OR 
  owner_id IN (
    SELECT home_builder_id 
    FROM public.users 
    WHERE id = auth.uid() AND confirmed = true
  )
);

-- =====================================================
-- FIX: bills table
-- =====================================================
DROP POLICY IF EXISTS "Company users can access all company data" ON public.bills;

CREATE POLICY "Users can access their company bills" 
ON public.bills 
FOR ALL 
USING (
  owner_id = auth.uid() 
  OR 
  owner_id IN (
    SELECT home_builder_id 
    FROM public.users 
    WHERE id = auth.uid() AND confirmed = true
  )
)
WITH CHECK (
  owner_id = auth.uid() 
  OR 
  owner_id IN (
    SELECT home_builder_id 
    FROM public.users 
    WHERE id = auth.uid() AND confirmed = true
  )
);

-- =====================================================
-- FIX: bill_lines table
-- =====================================================
DROP POLICY IF EXISTS "Company users can access all company data" ON public.bill_lines;

CREATE POLICY "Users can access their company bill lines" 
ON public.bill_lines 
FOR ALL 
USING (
  owner_id = auth.uid() 
  OR 
  owner_id IN (
    SELECT home_builder_id 
    FROM public.users 
    WHERE id = auth.uid() AND confirmed = true
  )
)
WITH CHECK (
  owner_id = auth.uid() 
  OR 
  owner_id IN (
    SELECT home_builder_id 
    FROM public.users 
    WHERE id = auth.uid() AND confirmed = true
  )
);

-- =====================================================
-- FIX: checks table
-- =====================================================
DROP POLICY IF EXISTS "Company users can access all company data" ON public.checks;

CREATE POLICY "Users can access their company checks" 
ON public.checks 
FOR ALL 
USING (
  owner_id = auth.uid() 
  OR 
  owner_id IN (
    SELECT home_builder_id 
    FROM public.users 
    WHERE id = auth.uid() AND confirmed = true
  )
)
WITH CHECK (
  owner_id = auth.uid() 
  OR 
  owner_id IN (
    SELECT home_builder_id 
    FROM public.users 
    WHERE id = auth.uid() AND confirmed = true
  )
);

-- =====================================================
-- FIX: check_lines table
-- =====================================================
DROP POLICY IF EXISTS "Company users can access all company data" ON public.check_lines;

CREATE POLICY "Users can access their company check lines" 
ON public.check_lines 
FOR ALL 
USING (
  owner_id = auth.uid() 
  OR 
  owner_id IN (
    SELECT home_builder_id 
    FROM public.users 
    WHERE id = auth.uid() AND confirmed = true
  )
)
WITH CHECK (
  owner_id = auth.uid() 
  OR 
  owner_id IN (
    SELECT home_builder_id 
    FROM public.users 
    WHERE id = auth.uid() AND confirmed = true
  )
);

-- =====================================================
-- FIX: deposits table
-- =====================================================
DROP POLICY IF EXISTS "Company users can access all company data" ON public.deposits;

CREATE POLICY "Users can access their company deposits" 
ON public.deposits 
FOR ALL 
USING (
  owner_id = auth.uid() 
  OR 
  owner_id IN (
    SELECT home_builder_id 
    FROM public.users 
    WHERE id = auth.uid() AND confirmed = true
  )
)
WITH CHECK (
  owner_id = auth.uid() 
  OR 
  owner_id IN (
    SELECT home_builder_id 
    FROM public.users 
    WHERE id = auth.uid() AND confirmed = true
  )
);

-- =====================================================
-- FIX: deposit_lines table
-- =====================================================
DROP POLICY IF EXISTS "Company users can access all company data" ON public.deposit_lines;

CREATE POLICY "Users can access their company deposit lines" 
ON public.deposit_lines 
FOR ALL 
USING (
  owner_id = auth.uid() 
  OR 
  owner_id IN (
    SELECT home_builder_id 
    FROM public.users 
    WHERE id = auth.uid() AND confirmed = true
  )
)
WITH CHECK (
  owner_id = auth.uid() 
  OR 
  owner_id IN (
    SELECT home_builder_id 
    FROM public.users 
    WHERE id = auth.uid() AND confirmed = true
  )
);

-- =====================================================
-- FIX: credit_cards table
-- =====================================================
DROP POLICY IF EXISTS "Company users can access all company data" ON public.credit_cards;

CREATE POLICY "Users can access their company credit cards" 
ON public.credit_cards 
FOR ALL 
USING (
  owner_id = auth.uid() 
  OR 
  owner_id IN (
    SELECT home_builder_id 
    FROM public.users 
    WHERE id = auth.uid() AND confirmed = true
  )
)
WITH CHECK (
  owner_id = auth.uid() 
  OR 
  owner_id IN (
    SELECT home_builder_id 
    FROM public.users 
    WHERE id = auth.uid() AND confirmed = true
  )
);

-- =====================================================
-- FIX: credit_card_lines table
-- =====================================================
DROP POLICY IF EXISTS "Company users can access all company data" ON public.credit_card_lines;

CREATE POLICY "Users can access their company credit card lines" 
ON public.credit_card_lines 
FOR ALL 
USING (
  owner_id = auth.uid() 
  OR 
  owner_id IN (
    SELECT home_builder_id 
    FROM public.users 
    WHERE id = auth.uid() AND confirmed = true
  )
)
WITH CHECK (
  owner_id = auth.uid() 
  OR 
  owner_id IN (
    SELECT home_builder_id 
    FROM public.users 
    WHERE id = auth.uid() AND confirmed = true
  )
);

-- =====================================================
-- FIX: accounts table
-- =====================================================
DROP POLICY IF EXISTS "Company users can access all company data" ON public.accounts;

CREATE POLICY "Users can access their company accounts" 
ON public.accounts 
FOR ALL 
USING (
  owner_id = auth.uid() 
  OR 
  owner_id IN (
    SELECT home_builder_id 
    FROM public.users 
    WHERE id = auth.uid() AND confirmed = true
  )
)
WITH CHECK (
  owner_id = auth.uid() 
  OR 
  owner_id IN (
    SELECT home_builder_id 
    FROM public.users 
    WHERE id = auth.uid() AND confirmed = true
  )
);

-- =====================================================
-- FIX: journal_entries table
-- =====================================================
DROP POLICY IF EXISTS "Company users can access all company data" ON public.journal_entries;

CREATE POLICY "Users can access their company journal entries" 
ON public.journal_entries 
FOR ALL 
USING (
  owner_id = auth.uid() 
  OR 
  owner_id IN (
    SELECT home_builder_id 
    FROM public.users 
    WHERE id = auth.uid() AND confirmed = true
  )
)
WITH CHECK (
  owner_id = auth.uid() 
  OR 
  owner_id IN (
    SELECT home_builder_id 
    FROM public.users 
    WHERE id = auth.uid() AND confirmed = true
  )
);

-- =====================================================
-- FIX: journal_entry_lines table
-- =====================================================
DROP POLICY IF EXISTS "Company users can access all company data" ON public.journal_entry_lines;

CREATE POLICY "Users can access their company journal entry lines" 
ON public.journal_entry_lines 
FOR ALL 
USING (
  owner_id = auth.uid() 
  OR 
  owner_id IN (
    SELECT home_builder_id 
    FROM public.users 
    WHERE id = auth.uid() AND confirmed = true
  )
)
WITH CHECK (
  owner_id = auth.uid() 
  OR 
  owner_id IN (
    SELECT home_builder_id 
    FROM public.users 
    WHERE id = auth.uid() AND confirmed = true
  )
);

-- =====================================================
-- FIX: bank_reconciliations table
-- =====================================================
DROP POLICY IF EXISTS "Company users can access all company data" ON public.bank_reconciliations;

CREATE POLICY "Users can access their company bank reconciliations" 
ON public.bank_reconciliations 
FOR ALL 
USING (
  owner_id = auth.uid() 
  OR 
  owner_id IN (
    SELECT home_builder_id 
    FROM public.users 
    WHERE id = auth.uid() AND confirmed = true
  )
)
WITH CHECK (
  owner_id = auth.uid() 
  OR 
  owner_id IN (
    SELECT home_builder_id 
    FROM public.users 
    WHERE id = auth.uid() AND confirmed = true
  )
);

-- =====================================================
-- FIX: accounting_periods table
-- =====================================================
DROP POLICY IF EXISTS "Company users can access all company data" ON public.accounting_periods;

CREATE POLICY "Users can access their company accounting periods" 
ON public.accounting_periods 
FOR ALL 
USING (
  owner_id = auth.uid() 
  OR 
  owner_id IN (
    SELECT home_builder_id 
    FROM public.users 
    WHERE id = auth.uid() AND confirmed = true
  )
)
WITH CHECK (
  owner_id = auth.uid() 
  OR 
  owner_id IN (
    SELECT home_builder_id 
    FROM public.users 
    WHERE id = auth.uid() AND confirmed = true
  )
);

-- =====================================================
-- FIX: accounting_settings table
-- =====================================================
DROP POLICY IF EXISTS "Company users can access all company data" ON public.accounting_settings;

CREATE POLICY "Users can access their company accounting settings" 
ON public.accounting_settings 
FOR ALL 
USING (
  owner_id = auth.uid() 
  OR 
  owner_id IN (
    SELECT home_builder_id 
    FROM public.users 
    WHERE id = auth.uid() AND confirmed = true
  )
)
WITH CHECK (
  owner_id = auth.uid() 
  OR 
  owner_id IN (
    SELECT home_builder_id 
    FROM public.users 
    WHERE id = auth.uid() AND confirmed = true
  )
);

-- =====================================================
-- FIX: pending_bill_uploads table
-- =====================================================
DROP POLICY IF EXISTS "Company users can access all company data" ON public.pending_bill_uploads;

CREATE POLICY "Users can access their company pending bill uploads" 
ON public.pending_bill_uploads 
FOR ALL 
USING (
  owner_id = auth.uid() 
  OR 
  owner_id IN (
    SELECT home_builder_id 
    FROM public.users 
    WHERE id = auth.uid() AND confirmed = true
  )
)
WITH CHECK (
  owner_id = auth.uid() 
  OR 
  owner_id IN (
    SELECT home_builder_id 
    FROM public.users 
    WHERE id = auth.uid() AND confirmed = true
  )
);

-- =====================================================
-- FIX: pending_bill_lines table
-- =====================================================
DROP POLICY IF EXISTS "Company users can access all company data" ON public.pending_bill_lines;

CREATE POLICY "Users can access their company pending bill lines" 
ON public.pending_bill_lines 
FOR ALL 
USING (
  owner_id = auth.uid() 
  OR 
  owner_id IN (
    SELECT home_builder_id 
    FROM public.users 
    WHERE id = auth.uid() AND confirmed = true
  )
)
WITH CHECK (
  owner_id = auth.uid() 
  OR 
  owner_id IN (
    SELECT home_builder_id 
    FROM public.users 
    WHERE id = auth.uid() AND confirmed = true
  )
);

-- =====================================================
-- FIX: pending_insurance_uploads table
-- =====================================================
DROP POLICY IF EXISTS "Company users can access all company data" ON public.pending_insurance_uploads;

CREATE POLICY "Users can access their company pending insurance uploads" 
ON public.pending_insurance_uploads 
FOR ALL 
USING (
  owner_id = auth.uid() 
  OR 
  owner_id IN (
    SELECT home_builder_id 
    FROM public.users 
    WHERE id = auth.uid() AND confirmed = true
  )
)
WITH CHECK (
  owner_id = auth.uid() 
  OR 
  owner_id IN (
    SELECT home_builder_id 
    FROM public.users 
    WHERE id = auth.uid() AND confirmed = true
  )
);

-- =====================================================
-- FIX: cost_code_price_history table
-- =====================================================
DROP POLICY IF EXISTS "Company users can access all company data" ON public.cost_code_price_history;

CREATE POLICY "Users can access their company cost code price history" 
ON public.cost_code_price_history 
FOR ALL 
USING (
  owner_id = auth.uid() 
  OR 
  owner_id IN (
    SELECT home_builder_id 
    FROM public.users 
    WHERE id = auth.uid() AND confirmed = true
  )
)
WITH CHECK (
  owner_id = auth.uid() 
  OR 
  owner_id IN (
    SELECT home_builder_id 
    FROM public.users 
    WHERE id = auth.uid() AND confirmed = true
  )
);