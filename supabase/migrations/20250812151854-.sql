-- Re-enable the check constraint for role validation
ALTER TABLE public.users ADD CONSTRAINT check_role_constraints 
CHECK (
  (role = 'owner' AND home_builder_id IS NULL AND company_name IS NOT NULL) OR
  (role = 'employee' AND home_builder_id IS NOT NULL AND company_name IS NOT NULL)
);