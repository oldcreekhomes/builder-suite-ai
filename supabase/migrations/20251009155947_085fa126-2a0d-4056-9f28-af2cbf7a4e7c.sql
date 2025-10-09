-- Step 1: Update the get_current_user_company() function to handle accountants
CREATE OR REPLACE FUNCTION public.get_current_user_company()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT CASE 
    WHEN u.role = 'owner' THEN u.company_name
    WHEN u.role = 'employee' THEN (
      SELECT owner.company_name 
      FROM public.users owner 
      WHERE owner.id = u.home_builder_id
    )
    WHEN u.role = 'accountant' THEN (
      SELECT owner.company_name 
      FROM public.users owner 
      WHERE owner.id = u.home_builder_id
    )
    ELSE NULL
  END
  FROM public.users u 
  WHERE u.id = auth.uid();
$$;

-- Step 2: Update RLS policies to include accountant role

-- accounting_settings policies
DROP POLICY IF EXISTS "Settings visible to owner and confirmed employees" ON public.accounting_settings;
CREATE POLICY "Settings visible to owner and confirmed employees" 
ON public.accounting_settings 
FOR SELECT 
USING (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT u.home_builder_id
    FROM users u
    WHERE u.id = auth.uid() 
      AND u.confirmed = true 
      AND u.role IN ('employee', 'accountant')
  ))
);

DROP POLICY IF EXISTS "Settings updatable/insertable by owner and confirmed employees" ON public.accounting_settings;
CREATE POLICY "Settings updatable/insertable by owner and confirmed employees" 
ON public.accounting_settings 
FOR ALL 
USING (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT u.home_builder_id
    FROM users u
    WHERE u.id = auth.uid() 
      AND u.confirmed = true 
      AND u.role IN ('employee', 'accountant')
  ))
)
WITH CHECK (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT u.home_builder_id
    FROM users u
    WHERE u.id = auth.uid() 
      AND u.confirmed = true 
      AND u.role IN ('employee', 'accountant')
  ))
);

-- accounts policies
DROP POLICY IF EXISTS "Enable read access for owners and employees" ON public.accounts;
CREATE POLICY "Enable read access for owners and employees" 
ON public.accounts 
FOR SELECT 
USING (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT users.home_builder_id
    FROM users
    WHERE users.id = auth.uid() 
      AND users.confirmed = true 
      AND users.role IN ('employee', 'accountant')
  ))
);

DROP POLICY IF EXISTS "Enable insert access for owners and employees" ON public.accounts;
CREATE POLICY "Enable insert access for owners and employees" 
ON public.accounts 
FOR INSERT 
WITH CHECK (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT users.home_builder_id
    FROM users
    WHERE users.id = auth.uid() 
      AND users.confirmed = true 
      AND users.role IN ('employee', 'accountant')
  ))
);

DROP POLICY IF EXISTS "Enable update access for owners and employees" ON public.accounts;
CREATE POLICY "Enable update access for owners and employees" 
ON public.accounts 
FOR UPDATE 
USING (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT users.home_builder_id
    FROM users
    WHERE users.id = auth.uid() 
      AND users.confirmed = true 
      AND users.role IN ('employee', 'accountant')
  ))
)
WITH CHECK (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT users.home_builder_id
    FROM users
    WHERE users.id = auth.uid() 
      AND users.confirmed = true 
      AND users.role IN ('employee', 'accountant')
  ))
);

DROP POLICY IF EXISTS "Enable delete access for owners and employees" ON public.accounts;
CREATE POLICY "Enable delete access for owners and employees" 
ON public.accounts 
FOR DELETE 
USING (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT users.home_builder_id
    FROM users
    WHERE users.id = auth.uid() 
      AND users.confirmed = true 
      AND users.role IN ('employee', 'accountant')
  ))
);

-- bills policies (update the 2 that need changing, leave delete policy alone as it uses has_role)
DROP POLICY IF EXISTS "Bills visible to owner and confirmed employees" ON public.bills;
CREATE POLICY "Bills visible to owner and confirmed employees" 
ON public.bills 
FOR SELECT 
USING (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT u.home_builder_id
    FROM users u
    WHERE u.id = auth.uid() 
      AND u.confirmed = true 
      AND u.role IN ('employee', 'accountant')
  ))
);

DROP POLICY IF EXISTS "Bills insert limited to owner and confirmed employees" ON public.bills;
CREATE POLICY "Bills insert limited to owner and confirmed employees" 
ON public.bills 
FOR INSERT 
WITH CHECK (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT u.home_builder_id
    FROM users u
    WHERE u.id = auth.uid() 
      AND u.confirmed = true 
      AND u.role IN ('employee', 'accountant')
  ))
);

DROP POLICY IF EXISTS "Bills update limited to owner and confirmed employees" ON public.bills;
CREATE POLICY "Bills update limited to owner and confirmed employees" 
ON public.bills 
FOR UPDATE 
USING (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT u.home_builder_id
    FROM users u
    WHERE u.id = auth.uid() 
      AND u.confirmed = true 
      AND u.role IN ('employee', 'accountant')
  ))
);

-- bill_lines policies
DROP POLICY IF EXISTS "Bill lines visible to owner and confirmed employees" ON public.bill_lines;
CREATE POLICY "Bill lines visible to owner and confirmed employees" 
ON public.bill_lines 
FOR SELECT 
USING (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT u.home_builder_id
    FROM users u
    WHERE u.id = auth.uid() 
      AND u.confirmed = true 
      AND u.role IN ('employee', 'accountant')
  ))
);

DROP POLICY IF EXISTS "Bill lines insert limited to owner and confirmed employees" ON public.bill_lines;
CREATE POLICY "Bill lines insert limited to owner and confirmed employees" 
ON public.bill_lines 
FOR INSERT 
WITH CHECK (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT u.home_builder_id
    FROM users u
    WHERE u.id = auth.uid() 
      AND u.confirmed = true 
      AND u.role IN ('employee', 'accountant')
  ))
);

DROP POLICY IF EXISTS "Bill lines update limited to owner and confirmed employees" ON public.bill_lines;
CREATE POLICY "Bill lines update limited to owner and confirmed employees" 
ON public.bill_lines 
FOR UPDATE 
USING (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT u.home_builder_id
    FROM users u
    WHERE u.id = auth.uid() 
      AND u.confirmed = true 
      AND u.role IN ('employee', 'accountant')
  ))
);

DROP POLICY IF EXISTS "Bill lines delete limited to owner and confirmed employees" ON public.bill_lines;
CREATE POLICY "Bill lines delete limited to owner and confirmed employees" 
ON public.bill_lines 
FOR DELETE 
USING (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT u.home_builder_id
    FROM users u
    WHERE u.id = auth.uid() 
      AND u.confirmed = true 
      AND u.role IN ('employee', 'accountant')
  ))
);

-- bill_attachments policies
DROP POLICY IF EXISTS "Bill attachments visible to owner and confirmed employees" ON public.bill_attachments;
CREATE POLICY "Bill attachments visible to owner and confirmed employees" 
ON public.bill_attachments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM bills b
    WHERE b.id = bill_attachments.bill_id 
      AND (
        (b.owner_id = auth.uid()) OR 
        (b.owner_id IN (
          SELECT u.home_builder_id
          FROM users u
          WHERE u.id = auth.uid() 
            AND u.confirmed = true 
            AND u.role IN ('employee', 'accountant')
        ))
      )
  )
);

DROP POLICY IF EXISTS "Bill attachments insert limited to owner and confirmed employee" ON public.bill_attachments;
CREATE POLICY "Bill attachments insert limited to owner and confirmed employee" 
ON public.bill_attachments 
FOR INSERT 
WITH CHECK (
  (uploaded_by = auth.uid()) AND 
  EXISTS (
    SELECT 1
    FROM bills b
    WHERE b.id = bill_attachments.bill_id 
      AND (
        (b.owner_id = auth.uid()) OR 
        (b.owner_id IN (
          SELECT u.home_builder_id
          FROM users u
          WHERE u.id = auth.uid() 
            AND u.confirmed = true 
            AND u.role IN ('employee', 'accountant')
        ))
      )
  )
);

DROP POLICY IF EXISTS "Bill attachments delete limited to owner and confirmed employee" ON public.bill_attachments;
CREATE POLICY "Bill attachments delete limited to owner and confirmed employee" 
ON public.bill_attachments 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1
    FROM bills b
    WHERE b.id = bill_attachments.bill_id 
      AND (
        (b.owner_id = auth.uid()) OR 
        (b.owner_id IN (
          SELECT u.home_builder_id
          FROM users u
          WHERE u.id = auth.uid() 
            AND u.confirmed = true 
            AND u.role IN ('employee', 'accountant')
        ))
      )
  )
);

-- bill_categorization_examples policy
DROP POLICY IF EXISTS "Categorization examples visible to company" ON public.bill_categorization_examples;
CREATE POLICY "Categorization examples visible to company" 
ON public.bill_categorization_examples 
FOR SELECT 
USING (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT u.home_builder_id
    FROM users u
    WHERE u.id = auth.uid() 
      AND u.confirmed = true 
      AND u.role IN ('employee', 'accountant')
  ))
);

-- pending_bill_uploads policies
DROP POLICY IF EXISTS "Pending uploads visible to owner and confirmed employees" ON public.pending_bill_uploads;
CREATE POLICY "Pending uploads visible to owner and confirmed employees" 
ON public.pending_bill_uploads 
FOR SELECT 
USING (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT u.home_builder_id
    FROM users u
    WHERE u.id = auth.uid() 
      AND u.confirmed = true 
      AND u.role IN ('employee', 'accountant')
  ))
);

DROP POLICY IF EXISTS "Pending uploads insert limited to owner and confirmed employees" ON public.pending_bill_uploads;
CREATE POLICY "Pending uploads insert limited to owner and confirmed employees" 
ON public.pending_bill_uploads 
FOR INSERT 
WITH CHECK (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT u.home_builder_id
    FROM users u
    WHERE u.id = auth.uid() 
      AND u.confirmed = true 
      AND u.role IN ('employee', 'accountant')
  ))
);

DROP POLICY IF EXISTS "Pending uploads update limited to owner and confirmed employees" ON public.pending_bill_uploads;
CREATE POLICY "Pending uploads update limited to owner and confirmed employees" 
ON public.pending_bill_uploads 
FOR UPDATE 
USING (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT u.home_builder_id
    FROM users u
    WHERE u.id = auth.uid() 
      AND u.confirmed = true 
      AND u.role IN ('employee', 'accountant')
  ))
);

DROP POLICY IF EXISTS "Pending uploads delete limited to owner and confirmed employees" ON public.pending_bill_uploads;
CREATE POLICY "Pending uploads delete limited to owner and confirmed employees" 
ON public.pending_bill_uploads 
FOR DELETE 
USING (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT u.home_builder_id
    FROM users u
    WHERE u.id = auth.uid() 
      AND u.confirmed = true 
      AND u.role IN ('employee', 'accountant')
  ))
);

-- pending_bill_lines policies
DROP POLICY IF EXISTS "Pending bill lines visible to owner and confirmed employees" ON public.pending_bill_lines;
CREATE POLICY "Pending bill lines visible to owner and confirmed employees" 
ON public.pending_bill_lines 
FOR SELECT 
USING (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT u.home_builder_id
    FROM users u
    WHERE u.id = auth.uid() 
      AND u.confirmed = true 
      AND u.role IN ('employee', 'accountant')
  ))
);

DROP POLICY IF EXISTS "Pending bill lines insert limited to owner and confirmed employ" ON public.pending_bill_lines;
CREATE POLICY "Pending bill lines insert limited to owner and confirmed employ" 
ON public.pending_bill_lines 
FOR INSERT 
WITH CHECK (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT u.home_builder_id
    FROM users u
    WHERE u.id = auth.uid() 
      AND u.confirmed = true 
      AND u.role IN ('employee', 'accountant')
  ))
);

DROP POLICY IF EXISTS "Pending bill lines update limited to owner and confirmed employ" ON public.pending_bill_lines;
CREATE POLICY "Pending bill lines update limited to owner and confirmed employ" 
ON public.pending_bill_lines 
FOR UPDATE 
USING (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT u.home_builder_id
    FROM users u
    WHERE u.id = auth.uid() 
      AND u.confirmed = true 
      AND u.role IN ('employee', 'accountant')
  ))
);

DROP POLICY IF EXISTS "Pending bill lines delete limited to owner and confirmed employ" ON public.pending_bill_lines;
CREATE POLICY "Pending bill lines delete limited to owner and confirmed employ" 
ON public.pending_bill_lines 
FOR DELETE 
USING (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT u.home_builder_id
    FROM users u
    WHERE u.id = auth.uid() 
      AND u.confirmed = true 
      AND u.role IN ('employee', 'accountant')
  ))
);

-- checks policies
DROP POLICY IF EXISTS "Checks visible to owner and confirmed employees" ON public.checks;
CREATE POLICY "Checks visible to owner and confirmed employees" 
ON public.checks 
FOR SELECT 
USING (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT u.home_builder_id
    FROM users u
    WHERE u.id = auth.uid() 
      AND u.confirmed = true 
      AND u.role IN ('employee', 'accountant')
  ))
);

DROP POLICY IF EXISTS "Checks insert limited to owner and confirmed employees" ON public.checks;
CREATE POLICY "Checks insert limited to owner and confirmed employees" 
ON public.checks 
FOR INSERT 
WITH CHECK (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT u.home_builder_id
    FROM users u
    WHERE u.id = auth.uid() 
      AND u.confirmed = true 
      AND u.role IN ('employee', 'accountant')
  ))
);

DROP POLICY IF EXISTS "Checks update limited to owner and confirmed employees" ON public.checks;
CREATE POLICY "Checks update limited to owner and confirmed employees" 
ON public.checks 
FOR UPDATE 
USING (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT u.home_builder_id
    FROM users u
    WHERE u.id = auth.uid() 
      AND u.confirmed = true 
      AND u.role IN ('employee', 'accountant')
  ))
);

DROP POLICY IF EXISTS "Checks delete limited to owner and confirmed employees" ON public.checks;
CREATE POLICY "Checks delete limited to owner and confirmed employees" 
ON public.checks 
FOR DELETE 
USING (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT u.home_builder_id
    FROM users u
    WHERE u.id = auth.uid() 
      AND u.confirmed = true 
      AND u.role IN ('employee', 'accountant')
  ))
);

-- check_lines policies
DROP POLICY IF EXISTS "Check lines visible to owner and confirmed employees" ON public.check_lines;
CREATE POLICY "Check lines visible to owner and confirmed employees" 
ON public.check_lines 
FOR SELECT 
USING (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT u.home_builder_id
    FROM users u
    WHERE u.id = auth.uid() 
      AND u.confirmed = true 
      AND u.role IN ('employee', 'accountant')
  ))
);

DROP POLICY IF EXISTS "Check lines insert limited to owner and confirmed employees" ON public.check_lines;
CREATE POLICY "Check lines insert limited to owner and confirmed employees" 
ON public.check_lines 
FOR INSERT 
WITH CHECK (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT u.home_builder_id
    FROM users u
    WHERE u.id = auth.uid() 
      AND u.confirmed = true 
      AND u.role IN ('employee', 'accountant')
  ))
);

DROP POLICY IF EXISTS "Check lines update limited to owner and confirmed employees" ON public.check_lines;
CREATE POLICY "Check lines update limited to owner and confirmed employees" 
ON public.check_lines 
FOR UPDATE 
USING (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT u.home_builder_id
    FROM users u
    WHERE u.id = auth.uid() 
      AND u.confirmed = true 
      AND u.role IN ('employee', 'accountant')
  ))
);

DROP POLICY IF EXISTS "Check lines delete limited to owner and confirmed employees" ON public.check_lines;
CREATE POLICY "Check lines delete limited to owner and confirmed employees" 
ON public.check_lines 
FOR DELETE 
USING (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT u.home_builder_id
    FROM users u
    WHERE u.id = auth.uid() 
      AND u.confirmed = true 
      AND u.role IN ('employee', 'accountant')
  ))
);

-- deposits policies
DROP POLICY IF EXISTS "Deposits visible to owner and confirmed employees" ON public.deposits;
CREATE POLICY "Deposits visible to owner and confirmed employees" 
ON public.deposits 
FOR SELECT 
USING (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT u.home_builder_id
    FROM users u
    WHERE u.id = auth.uid() 
      AND u.confirmed = true 
      AND u.role IN ('employee', 'accountant')
  ))
);

DROP POLICY IF EXISTS "Deposits insert limited to owner and confirmed employees" ON public.deposits;
CREATE POLICY "Deposits insert limited to owner and confirmed employees" 
ON public.deposits 
FOR INSERT 
WITH CHECK (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT u.home_builder_id
    FROM users u
    WHERE u.id = auth.uid() 
      AND u.confirmed = true 
      AND u.role IN ('employee', 'accountant')
  ))
);

DROP POLICY IF EXISTS "Deposits update limited to owner and confirmed employees" ON public.deposits;
CREATE POLICY "Deposits update limited to owner and confirmed employees" 
ON public.deposits 
FOR UPDATE 
USING (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT u.home_builder_id
    FROM users u
    WHERE u.id = auth.uid() 
      AND u.confirmed = true 
      AND u.role IN ('employee', 'accountant')
  ))
);

DROP POLICY IF EXISTS "Deposits delete limited to owner and confirmed employees" ON public.deposits;
CREATE POLICY "Deposits delete limited to owner and confirmed employees" 
ON public.deposits 
FOR DELETE 
USING (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT u.home_builder_id
    FROM users u
    WHERE u.id = auth.uid() 
      AND u.confirmed = true 
      AND u.role IN ('employee', 'accountant')
  ))
);

-- deposit_lines policies
DROP POLICY IF EXISTS "Deposit lines visible to owner and confirmed employees" ON public.deposit_lines;
CREATE POLICY "Deposit lines visible to owner and confirmed employees" 
ON public.deposit_lines 
FOR SELECT 
USING (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT u.home_builder_id
    FROM users u
    WHERE u.id = auth.uid() 
      AND u.confirmed = true 
      AND u.role IN ('employee', 'accountant')
  ))
);

DROP POLICY IF EXISTS "Deposit lines insert limited to owner and confirmed employees" ON public.deposit_lines;
CREATE POLICY "Deposit lines insert limited to owner and confirmed employees" 
ON public.deposit_lines 
FOR INSERT 
WITH CHECK (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT u.home_builder_id
    FROM users u
    WHERE u.id = auth.uid() 
      AND u.confirmed = true 
      AND u.role IN ('employee', 'accountant')
  ))
);

DROP POLICY IF EXISTS "Deposit lines update limited to owner and confirmed employees" ON public.deposit_lines;
CREATE POLICY "Deposit lines update limited to owner and confirmed employees" 
ON public.deposit_lines 
FOR UPDATE 
USING (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT u.home_builder_id
    FROM users u
    WHERE u.id = auth.uid() 
      AND u.confirmed = true 
      AND u.role IN ('employee', 'accountant')
  ))
);

DROP POLICY IF EXISTS "Deposit lines delete limited to owner and confirmed employees" ON public.deposit_lines;
CREATE POLICY "Deposit lines delete limited to owner and confirmed employees" 
ON public.deposit_lines 
FOR DELETE 
USING (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT u.home_builder_id
    FROM users u
    WHERE u.id = auth.uid() 
      AND u.confirmed = true 
      AND u.role IN ('employee', 'accountant')
  ))
);

-- deposit_sources policies
DROP POLICY IF EXISTS "Deposit sources visible to owner and confirmed employees" ON public.deposit_sources;
CREATE POLICY "Deposit sources visible to owner and confirmed employees" 
ON public.deposit_sources 
FOR SELECT 
USING (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT users.home_builder_id
    FROM users
    WHERE users.id = auth.uid() 
      AND users.confirmed = true 
      AND users.role IN ('employee', 'accountant')
  ))
);

DROP POLICY IF EXISTS "Deposit sources insert limited to owner and confirmed employees" ON public.deposit_sources;
CREATE POLICY "Deposit sources insert limited to owner and confirmed employees" 
ON public.deposit_sources 
FOR INSERT 
WITH CHECK (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT users.home_builder_id
    FROM users
    WHERE users.id = auth.uid() 
      AND users.confirmed = true 
      AND users.role IN ('employee', 'accountant')
  ))
);

DROP POLICY IF EXISTS "Deposit sources update limited to owner and confirmed employees" ON public.deposit_sources;
CREATE POLICY "Deposit sources update limited to owner and confirmed employees" 
ON public.deposit_sources 
FOR UPDATE 
USING (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT users.home_builder_id
    FROM users
    WHERE users.id = auth.uid() 
      AND users.confirmed = true 
      AND users.role IN ('employee', 'accountant')
  ))
);

DROP POLICY IF EXISTS "Deposit sources delete limited to owner and confirmed employees" ON public.deposit_sources;
CREATE POLICY "Deposit sources delete limited to owner and confirmed employees" 
ON public.deposit_sources 
FOR DELETE 
USING (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT users.home_builder_id
    FROM users
    WHERE users.id = auth.uid() 
      AND users.confirmed = true 
      AND users.role IN ('employee', 'accountant')
  ))
);

-- journal_entries policies
DROP POLICY IF EXISTS "Journal entries visible to owner and confirmed employees" ON public.journal_entries;
CREATE POLICY "Journal entries visible to owner and confirmed employees" 
ON public.journal_entries 
FOR SELECT 
USING (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT u.home_builder_id
    FROM users u
    WHERE u.id = auth.uid() 
      AND u.confirmed = true 
      AND u.role IN ('employee', 'accountant')
  ))
);

DROP POLICY IF EXISTS "Journal entries CUD limited to owner and confirmed employees" ON public.journal_entries;
CREATE POLICY "Journal entries CUD limited to owner and confirmed employees" 
ON public.journal_entries 
FOR ALL 
USING (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT u.home_builder_id
    FROM users u
    WHERE u.id = auth.uid() 
      AND u.confirmed = true 
      AND u.role IN ('employee', 'accountant')
  ))
)
WITH CHECK (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT u.home_builder_id
    FROM users u
    WHERE u.id = auth.uid() 
      AND u.confirmed = true 
      AND u.role IN ('employee', 'accountant')
  ))
);

-- journal_entry_lines policies
DROP POLICY IF EXISTS "Journal entry lines visible to owner and confirmed employees" ON public.journal_entry_lines;
CREATE POLICY "Journal entry lines visible to owner and confirmed employees" 
ON public.journal_entry_lines 
FOR SELECT 
USING (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT u.home_builder_id
    FROM users u
    WHERE u.id = auth.uid() 
      AND u.confirmed = true 
      AND u.role IN ('employee', 'accountant')
  ))
);

DROP POLICY IF EXISTS "Journal entry lines CUD limited to owner and confirmed employee" ON public.journal_entry_lines;
CREATE POLICY "Journal entry lines CUD limited to owner and confirmed employee" 
ON public.journal_entry_lines 
FOR ALL 
USING (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT u.home_builder_id
    FROM users u
    WHERE u.id = auth.uid() 
      AND u.confirmed = true 
      AND u.role IN ('employee', 'accountant')
  ))
)
WITH CHECK (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT u.home_builder_id
    FROM users u
    WHERE u.id = auth.uid() 
      AND u.confirmed = true 
      AND u.role IN ('employee', 'accountant')
  ))
);

-- companies policy
DROP POLICY IF EXISTS "Companies scoped to home builder" ON public.companies;
CREATE POLICY "Companies scoped to home builder" 
ON public.companies 
FOR ALL 
USING (
  (home_builder_id = auth.uid()) OR 
  (home_builder_id IN (
    SELECT u.home_builder_id
    FROM users u
    WHERE u.id = auth.uid() 
      AND u.confirmed = true 
      AND u.role IN ('employee', 'accountant')
  ))
)
WITH CHECK (
  (home_builder_id = auth.uid()) OR 
  (home_builder_id IN (
    SELECT u.home_builder_id
    FROM users u
    WHERE u.id = auth.uid() 
      AND u.confirmed = true 
      AND u.role IN ('employee', 'accountant')
  ))
);

-- company_representatives policy
DROP POLICY IF EXISTS "Company reps scoped to home builder" ON public.company_representatives;
CREATE POLICY "Company reps scoped to home builder" 
ON public.company_representatives 
FOR ALL 
USING (
  (home_builder_id = auth.uid()) OR 
  (home_builder_id IN (
    SELECT u.home_builder_id
    FROM users u
    WHERE u.id = auth.uid() 
      AND u.confirmed = true 
      AND u.role IN ('employee', 'accountant')
  ))
)
WITH CHECK (
  (home_builder_id = auth.uid()) OR 
  (home_builder_id IN (
    SELECT u.home_builder_id
    FROM users u
    WHERE u.id = auth.uid() 
      AND u.confirmed = true 
      AND u.role IN ('employee', 'accountant')
  ))
);

-- project_bid_packages policy
DROP POLICY IF EXISTS "Owners and employees can manage bid packages" ON public.project_bid_packages;
CREATE POLICY "Owners and employees can manage bid packages" 
ON public.project_bid_packages 
FOR ALL 
USING (
  EXISTS (
    SELECT 1
    FROM users u
    JOIN projects p ON (
      ((u.role = 'owner' AND p.owner_id = u.id) OR 
       (u.role IN ('employee', 'accountant') AND u.confirmed = true AND p.owner_id = u.home_builder_id))
    )
    WHERE u.id = auth.uid() 
      AND p.id = project_bid_packages.project_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM users u
    JOIN projects p ON (
      ((u.role = 'owner' AND p.owner_id = u.id) OR 
       (u.role IN ('employee', 'accountant') AND u.confirmed = true AND p.owner_id = u.home_builder_id))
    )
    WHERE u.id = auth.uid() 
      AND p.id = project_bid_packages.project_id
  )
);