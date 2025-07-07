-- Drop the employee_invitations table and related functions as they're no longer needed
-- The current system manages employees directly through the employees table

-- Drop the functions that depend on employee_invitations
DROP FUNCTION IF EXISTS public.invite_employee(text, text, text, text, text);
DROP FUNCTION IF EXISTS public.confirm_invitation(uuid);
DROP FUNCTION IF EXISTS public.create_user_from_invitation(uuid, text);

-- Drop the employee_invitations table
DROP TABLE IF EXISTS public.employee_invitations;