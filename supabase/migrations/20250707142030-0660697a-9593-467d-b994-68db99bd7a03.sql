-- Migrate existing employee data from profiles to employees table
INSERT INTO public.employees (
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
  home_builder_id,
  email,
  first_name,
  last_name,
  phone_number,
  COALESCE(role, 'employee') as role,
  avatar_url,
  approved_by_home_builder as confirmed,
  created_at,
  updated_at
FROM public.profiles 
WHERE user_type = 'employee' 
  AND home_builder_id IS NOT NULL
ON CONFLICT (email, home_builder_id) DO NOTHING;

-- Clean up employee records from profiles table (keep only home builders)
DELETE FROM public.profiles WHERE user_type = 'employee';