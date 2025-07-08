-- Remove the foreign key constraint that only allows users table references
ALTER TABLE public.project_files DROP CONSTRAINT IF EXISTS project_files_uploaded_by_fkey;

-- Allow uploaded_by to reference either users or employees table 
-- We'll handle this validation in the application layer instead of database constraints
-- since we have users in different tables (users and employees)