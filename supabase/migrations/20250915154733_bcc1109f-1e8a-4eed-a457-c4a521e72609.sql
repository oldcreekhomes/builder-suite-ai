-- Fix security vulnerability: Restrict issue files access to company members only

-- Drop the overly permissive policy that allows all authenticated users to view all issue files
DROP POLICY IF EXISTS "Users can view issue files" ON public.issue_files;

-- Create a secure policy that only allows users to see issue files from their own company
CREATE POLICY "Company users can view their company's issue files" 
ON public.issue_files 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.company_issues ci 
    WHERE ci.id = issue_files.issue_id 
      AND ci.company_name = get_current_user_company()
  )
);

-- Also restrict INSERT, UPDATE, DELETE operations to company members
DROP POLICY IF EXISTS "Authenticated users can insert issue files" ON public.issue_files;
DROP POLICY IF EXISTS "Authenticated users can update issue files" ON public.issue_files;  
DROP POLICY IF EXISTS "Authenticated users can delete issue files" ON public.issue_files;

CREATE POLICY "Company users can insert issue files for their company's issues" 
ON public.issue_files 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.company_issues ci 
    WHERE ci.id = issue_files.issue_id 
      AND ci.company_name = get_current_user_company()
  )
);

CREATE POLICY "Company users can update their company's issue files" 
ON public.issue_files 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 
    FROM public.company_issues ci 
    WHERE ci.id = issue_files.issue_id 
      AND ci.company_name = get_current_user_company()
  )
);

CREATE POLICY "Company users can delete their company's issue files" 
ON public.issue_files 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 
    FROM public.company_issues ci 
    WHERE ci.id = issue_files.issue_id 
      AND ci.company_name = get_current_user_company()
  )
);