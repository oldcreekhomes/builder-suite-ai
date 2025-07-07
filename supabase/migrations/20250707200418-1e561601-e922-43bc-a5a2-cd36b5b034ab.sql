-- Move Erica Gray from users table to employees table where she belongs
-- She's an employee, not a home builder

-- First, insert Erica into the employees table
INSERT INTO public.employees (
  id,
  home_builder_id,
  email,
  first_name,
  last_name,
  phone_number,
  role,
  avatar_url,
  confirmed,
  created_at,
  updated_at
)
SELECT 
  id,
  home_builder_id,
  email,
  first_name,
  last_name,
  phone_number,
  role,
  avatar_url,
  confirmed,
  created_at,
  updated_at
FROM public.users 
WHERE email = 'egray@oldcreekhomes.com' 
  AND user_type = 'employee';

-- Then remove her from the users table
DELETE FROM public.users 
WHERE email = 'egray@oldcreekhomes.com' 
  AND user_type = 'employee';