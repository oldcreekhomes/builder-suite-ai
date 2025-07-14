-- Create company-based RLS policies for project_bid_packages table
CREATE POLICY "Company users can access their company project bid packages" ON public.project_bid_packages
FOR ALL
USING (
  project_id IN (
    SELECT p.id FROM public.projects p
    JOIN public.users project_owner ON project_owner.id = p.owner_id
    WHERE project_owner.company_name = public.get_current_user_company()
  )
)
WITH CHECK (
  project_id IN (
    SELECT p.id FROM public.projects p
    JOIN public.users project_owner ON project_owner.id = p.owner_id
    WHERE project_owner.company_name = public.get_current_user_company()
  )
);

-- Create company-based RLS policies for project_bid_package_companies table
CREATE POLICY "Company users can access their company project bid package companies" ON public.project_bid_package_companies
FOR ALL
USING (
  bid_package_id IN (
    SELECT bp.id FROM public.project_bid_packages bp
    JOIN public.projects p ON p.id = bp.project_id
    JOIN public.users project_owner ON project_owner.id = p.owner_id
    WHERE project_owner.company_name = public.get_current_user_company()
  )
)
WITH CHECK (
  bid_package_id IN (
    SELECT bp.id FROM public.project_bid_packages bp
    JOIN public.projects p ON p.id = bp.project_id
    JOIN public.users project_owner ON project_owner.id = p.owner_id
    WHERE project_owner.company_name = public.get_current_user_company()
  )
);