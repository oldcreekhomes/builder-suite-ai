-- Create company-based RLS policies for companies table
CREATE POLICY "Company users can access their company data" ON public.companies
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users company_owner 
    WHERE company_owner.id = companies.owner_id 
    AND company_owner.company_name = public.get_current_user_company()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users company_owner 
    WHERE company_owner.id = companies.owner_id 
    AND company_owner.company_name = public.get_current_user_company()
  )
);

-- Create company-based RLS policies for company_cost_codes table
CREATE POLICY "Company users can access their company cost codes" ON public.company_cost_codes
FOR ALL
USING (
  company_id IN (
    SELECT c.id FROM public.companies c
    JOIN public.users company_owner ON company_owner.id = c.owner_id
    WHERE company_owner.company_name = public.get_current_user_company()
  )
)
WITH CHECK (
  company_id IN (
    SELECT c.id FROM public.companies c
    JOIN public.users company_owner ON company_owner.id = c.owner_id
    WHERE company_owner.company_name = public.get_current_user_company()
  )
);

-- Create company-based RLS policies for company_representatives table
CREATE POLICY "Company users can access their company representatives" ON public.company_representatives
FOR ALL
USING (
  company_id IN (
    SELECT c.id FROM public.companies c
    JOIN public.users company_owner ON company_owner.id = c.owner_id
    WHERE company_owner.company_name = public.get_current_user_company()
  )
)
WITH CHECK (
  company_id IN (
    SELECT c.id FROM public.companies c
    JOIN public.users company_owner ON company_owner.id = c.owner_id
    WHERE company_owner.company_name = public.get_current_user_company()
  )
);

-- Create company-based RLS policies for cost_codes table
CREATE POLICY "Company users can access their company cost codes" ON public.cost_codes
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users cost_code_owner 
    WHERE cost_code_owner.id = cost_codes.owner_id 
    AND cost_code_owner.company_name = public.get_current_user_company()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users cost_code_owner 
    WHERE cost_code_owner.id = cost_codes.owner_id 
    AND cost_code_owner.company_name = public.get_current_user_company()
  )
);

-- Create company-based RLS policies for cost_code_specifications table
CREATE POLICY "Company users can access their company cost code specifications" ON public.cost_code_specifications
FOR ALL
USING (
  cost_code_id IN (
    SELECT cc.id FROM public.cost_codes cc
    JOIN public.users cost_code_owner ON cost_code_owner.id = cc.owner_id
    WHERE cost_code_owner.company_name = public.get_current_user_company()
  )
)
WITH CHECK (
  cost_code_id IN (
    SELECT cc.id FROM public.cost_codes cc
    JOIN public.users cost_code_owner ON cost_code_owner.id = cc.owner_id
    WHERE cost_code_owner.company_name = public.get_current_user_company()
  )
);