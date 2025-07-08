-- Update RLS policies to give employees access to everything except employee management

-- Update company_cost_codes policies to include employees
DROP POLICY IF EXISTS "Owners can create cost code associations for their companies" ON public.company_cost_codes;
DROP POLICY IF EXISTS "Owners can delete cost code associations of their companies" ON public.company_cost_codes;
DROP POLICY IF EXISTS "Owners can view cost codes of their companies" ON public.company_cost_codes;

CREATE POLICY "Owners and employees can create cost code associations" 
ON public.company_cost_codes 
FOR INSERT 
WITH CHECK (EXISTS ( SELECT 1
   FROM companies
  WHERE ((companies.id = company_cost_codes.company_id) AND ((companies.owner_id = auth.uid()) OR (companies.owner_id IN ( SELECT employees.home_builder_id
           FROM employees
          WHERE ((employees.id = auth.uid()) AND (employees.confirmed = true))))))));

CREATE POLICY "Owners and employees can delete cost code associations" 
ON public.company_cost_codes 
FOR DELETE 
USING (EXISTS ( SELECT 1
   FROM companies
  WHERE ((companies.id = company_cost_codes.company_id) AND ((companies.owner_id = auth.uid()) OR (companies.owner_id IN ( SELECT employees.home_builder_id
           FROM employees
          WHERE ((employees.id = auth.uid()) AND (employees.confirmed = true))))))));

CREATE POLICY "Owners and employees can view cost code associations" 
ON public.company_cost_codes 
FOR SELECT 
USING (EXISTS ( SELECT 1
   FROM companies
  WHERE ((companies.id = company_cost_codes.company_id) AND ((companies.owner_id = auth.uid()) OR (companies.owner_id IN ( SELECT employees.home_builder_id
           FROM employees
          WHERE ((employees.id = auth.uid()) AND (employees.confirmed = true))))))));

-- Update project_bid_packages policies to include employees
DROP POLICY IF EXISTS "Owners can create bid packages for their projects" ON public.project_bid_packages;
DROP POLICY IF EXISTS "Owners can delete bid packages for their projects" ON public.project_bid_packages;
DROP POLICY IF EXISTS "Owners can update bid packages for their projects" ON public.project_bid_packages;
DROP POLICY IF EXISTS "Owners can view bid packages for their projects" ON public.project_bid_packages;

CREATE POLICY "Owners and employees can create bid packages" 
ON public.project_bid_packages 
FOR INSERT 
WITH CHECK (EXISTS ( SELECT 1
   FROM projects
  WHERE ((projects.id = project_bid_packages.project_id) AND ((projects.owner_id = auth.uid()) OR (projects.owner_id IN ( SELECT employees.home_builder_id
           FROM employees
          WHERE ((employees.id = auth.uid()) AND (employees.confirmed = true))))))));

CREATE POLICY "Owners and employees can delete bid packages" 
ON public.project_bid_packages 
FOR DELETE 
USING (EXISTS ( SELECT 1
   FROM projects
  WHERE ((projects.id = project_bid_packages.project_id) AND ((projects.owner_id = auth.uid()) OR (projects.owner_id IN ( SELECT employees.home_builder_id
           FROM employees
          WHERE ((employees.id = auth.uid()) AND (employees.confirmed = true))))))));

CREATE POLICY "Owners and employees can update bid packages" 
ON public.project_bid_packages 
FOR UPDATE 
USING (EXISTS ( SELECT 1
   FROM projects
  WHERE ((projects.id = project_bid_packages.project_id) AND ((projects.owner_id = auth.uid()) OR (projects.owner_id IN ( SELECT employees.home_builder_id
           FROM employees
          WHERE ((employees.id = auth.uid()) AND (employees.confirmed = true))))))));

CREATE POLICY "Owners and employees can view bid packages" 
ON public.project_bid_packages 
FOR SELECT 
USING (EXISTS ( SELECT 1
   FROM projects
  WHERE ((projects.id = project_bid_packages.project_id) AND ((projects.owner_id = auth.uid()) OR (projects.owner_id IN ( SELECT employees.home_builder_id
           FROM employees
          WHERE ((employees.id = auth.uid()) AND (employees.confirmed = true))))))));

-- Update project_bid_package_companies policies to include employees
DROP POLICY IF EXISTS "Owners can create bid package companies for their projects" ON public.project_bid_package_companies;
DROP POLICY IF EXISTS "Owners can delete bid package companies for their projects" ON public.project_bid_package_companies;
DROP POLICY IF EXISTS "Owners can update bid package companies for their projects" ON public.project_bid_package_companies;
DROP POLICY IF EXISTS "Owners can view bid package companies for their projects" ON public.project_bid_package_companies;

CREATE POLICY "Owners and employees can create bid package companies" 
ON public.project_bid_package_companies 
FOR INSERT 
WITH CHECK (EXISTS ( SELECT 1
   FROM (project_bid_packages bp
     JOIN projects p ON ((bp.project_id = p.id)))
  WHERE ((bp.id = project_bid_package_companies.bid_package_id) AND ((p.owner_id = auth.uid()) OR (p.owner_id IN ( SELECT employees.home_builder_id
           FROM employees
          WHERE ((employees.id = auth.uid()) AND (employees.confirmed = true))))))));

CREATE POLICY "Owners and employees can delete bid package companies" 
ON public.project_bid_package_companies 
FOR DELETE 
USING (EXISTS ( SELECT 1
   FROM (project_bid_packages bp
     JOIN projects p ON ((bp.project_id = p.id)))
  WHERE ((bp.id = project_bid_package_companies.bid_package_id) AND ((p.owner_id = auth.uid()) OR (p.owner_id IN ( SELECT employees.home_builder_id
           FROM employees
          WHERE ((employees.id = auth.uid()) AND (employees.confirmed = true))))))));

CREATE POLICY "Owners and employees can update bid package companies" 
ON public.project_bid_package_companies 
FOR UPDATE 
USING (EXISTS ( SELECT 1
   FROM (project_bid_packages bp
     JOIN projects p ON ((bp.project_id = p.id)))
  WHERE ((bp.id = project_bid_package_companies.bid_package_id) AND ((p.owner_id = auth.uid()) OR (p.owner_id IN ( SELECT employees.home_builder_id
           FROM employees
          WHERE ((employees.id = auth.uid()) AND (employees.confirmed = true))))))));

CREATE POLICY "Owners and employees can view bid package companies" 
ON public.project_bid_package_companies 
FOR SELECT 
USING (EXISTS ( SELECT 1
   FROM (project_bid_packages bp
     JOIN projects p ON ((bp.project_id = p.id)))
  WHERE ((bp.id = project_bid_package_companies.bid_package_id) AND ((p.owner_id = auth.uid()) OR (p.owner_id IN ( SELECT employees.home_builder_id
           FROM employees
          WHERE ((employees.id = auth.uid()) AND (employees.confirmed = true))))))));

-- Keep employee management restricted to owners only - employees can only view and update their own records
-- The existing policies on employees table are correct for this requirement:
-- - Owners can manage all employees (CREATE, UPDATE, DELETE)  
-- - Employees can only view company employees and update their own record
-- - Employees CANNOT create, approve, or delete other employees