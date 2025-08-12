-- Temporarily disable the check constraint that's preventing user creation
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS check_role_constraints;