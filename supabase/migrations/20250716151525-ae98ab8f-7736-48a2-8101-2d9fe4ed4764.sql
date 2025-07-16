-- Multi-tenant SaaS RLS simplification
-- This migration replaces all complex RLS policies with simple company-based isolation

-- First, drop all existing RLS policies on all tables
DROP POLICY IF EXISTS "Company users can access their company data" ON public.companies;
DROP POLICY IF EXISTS "Company users can access their company cost codes" ON public.company_cost_codes;
DROP POLICY IF EXISTS "Company users can access their company representatives" ON public.company_representatives;
DROP POLICY IF EXISTS "Company users can access their company cost code specifications" ON public.cost_code_specifications;
DROP POLICY IF EXISTS "Company users can access their company cost codes" ON public.cost_codes;
DROP POLICY IF EXISTS "Company users can access their company project bid package comp" ON public.project_bid_package_companies;
DROP POLICY IF EXISTS "Company users can access their company project bid packages" ON public.project_bid_packages;
DROP POLICY IF EXISTS "Company users can access all company project budgets" ON public.project_budgets;
DROP POLICY IF EXISTS "Company users can access all company project files" ON public.project_files;
DROP POLICY IF EXISTS "Company users can access all company project photos" ON public.project_photos;
DROP POLICY IF EXISTS "Company users can access all company project schedule tasks" ON public.project_schedule_tasks;
DROP POLICY IF EXISTS "Company users can access all company projects" ON public.projects;

-- Drop existing users table policies
DROP POLICY IF EXISTS "Users can view their own profile and employees can view their home builder" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.users;
DROP POLICY IF EXISTS "Employees can view company users" ON public.users;
DROP POLICY IF EXISTS "Employees can view their home builder" ON public.users;
DROP POLICY IF EXISTS "Owners can manage their employees" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;

-- Create simple, standardized RLS policies for all company-related tables

-- Companies table
CREATE POLICY "Company users can access all company data" 
ON public.companies 
FOR ALL 
USING (get_current_user_company() IS NOT NULL)
WITH CHECK (get_current_user_company() IS NOT NULL);

-- Company cost codes table
CREATE POLICY "Company users can access all company data" 
ON public.company_cost_codes 
FOR ALL 
USING (get_current_user_company() IS NOT NULL)
WITH CHECK (get_current_user_company() IS NOT NULL);

-- Company representatives table
CREATE POLICY "Company users can access all company data" 
ON public.company_representatives 
FOR ALL 
USING (get_current_user_company() IS NOT NULL)
WITH CHECK (get_current_user_company() IS NOT NULL);

-- Cost code specifications table
CREATE POLICY "Company users can access all company data" 
ON public.cost_code_specifications 
FOR ALL 
USING (get_current_user_company() IS NOT NULL)
WITH CHECK (get_current_user_company() IS NOT NULL);

-- Cost codes table
CREATE POLICY "Company users can access all company data" 
ON public.cost_codes 
FOR ALL 
USING (get_current_user_company() IS NOT NULL)
WITH CHECK (get_current_user_company() IS NOT NULL);

-- Project bid package companies table
CREATE POLICY "Company users can access all company data" 
ON public.project_bid_package_companies 
FOR ALL 
USING (get_current_user_company() IS NOT NULL)
WITH CHECK (get_current_user_company() IS NOT NULL);

-- Project bid packages table
CREATE POLICY "Company users can access all company data" 
ON public.project_bid_packages 
FOR ALL 
USING (get_current_user_company() IS NOT NULL)
WITH CHECK (get_current_user_company() IS NOT NULL);

-- Project budgets table
CREATE POLICY "Company users can access all company data" 
ON public.project_budgets 
FOR ALL 
USING (get_current_user_company() IS NOT NULL)
WITH CHECK (get_current_user_company() IS NOT NULL);

-- Project files table
CREATE POLICY "Company users can access all company data" 
ON public.project_files 
FOR ALL 
USING (get_current_user_company() IS NOT NULL)
WITH CHECK (get_current_user_company() IS NOT NULL);

-- Project photos table
CREATE POLICY "Company users can access all company data" 
ON public.project_photos 
FOR ALL 
USING (get_current_user_company() IS NOT NULL)
WITH CHECK (get_current_user_company() IS NOT NULL);

-- Project schedule tasks table
CREATE POLICY "Company users can access all company data" 
ON public.project_schedule_tasks 
FOR ALL 
USING (get_current_user_company() IS NOT NULL)
WITH CHECK (get_current_user_company() IS NOT NULL);

-- Projects table
CREATE POLICY "Company users can access all company data" 
ON public.projects 
FOR ALL 
USING (get_current_user_company() IS NOT NULL)
WITH CHECK (get_current_user_company() IS NOT NULL);

-- Special handling for users table - allow users to see themselves and company colleagues
CREATE POLICY "Users can view their own profile" 
ON public.users 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can view company colleagues" 
ON public.users 
FOR SELECT 
USING (get_current_user_company() IS NOT NULL AND company_name = get_current_user_company());

CREATE POLICY "Users can update their own profile" 
ON public.users 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Owners can insert employees" 
ON public.users 
FOR INSERT 
WITH CHECK (
  (role = 'owner' AND auth.uid() = id) OR 
  (role = 'employee' AND EXISTS (
    SELECT 1 FROM public.users owner 
    WHERE owner.id = auth.uid() 
    AND owner.role = 'owner'
    AND owner.company_name = get_current_user_company()
  ))
);

CREATE POLICY "Owners can manage their employees" 
ON public.users 
FOR UPDATE 
USING (
  auth.uid() = id OR 
  (role = 'employee' AND EXISTS (
    SELECT 1 FROM public.users owner 
    WHERE owner.id = auth.uid() 
    AND owner.role = 'owner'
    AND owner.company_name = company_name
  ))
)
WITH CHECK (
  auth.uid() = id OR 
  (role = 'employee' AND EXISTS (
    SELECT 1 FROM public.users owner 
    WHERE owner.id = auth.uid() 
    AND owner.role = 'owner'
    AND owner.company_name = company_name
  ))
);

-- Keep existing user chat messages policies (user-to-user messaging)
-- Keep existing user notification preferences policies (user-specific)
-- Keep existing marketplace policies (public access)