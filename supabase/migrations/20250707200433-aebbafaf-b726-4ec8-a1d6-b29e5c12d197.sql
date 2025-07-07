-- Remove Erica Gray's duplicate entry from users table
-- She belongs in employees table only
DELETE FROM public.users 
WHERE email = 'egray@oldcreekhomes.com' 
  AND user_type = 'employee';