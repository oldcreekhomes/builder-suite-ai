-- Relax role constraint to allow 'accountant' for users linked to a home builder
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS check_role_constraints;

ALTER TABLE public.users
ADD CONSTRAINT check_role_constraints
CHECK (
  (home_builder_id IS NULL AND role = 'owner')
  OR
  (home_builder_id IS NOT NULL AND role IN ('employee','accountant'))
);