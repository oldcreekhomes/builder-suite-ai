-- Update users_role_check to allow 'accountant'
BEGIN;

-- 1) Drop legacy constraint that blocks roles other than owner/employee
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

-- 2) Recreate with expanded allowed roles (minimal set to fix current issue)
ALTER TABLE public.users
ADD CONSTRAINT users_role_check
CHECK (role IN ('owner','employee','accountant'));

COMMIT;