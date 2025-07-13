-- Update employees to have the same company_name as their owner
UPDATE public.users 
SET company_name = owner.company_name
FROM public.users AS owner
WHERE users.role = 'employee' 
  AND users.home_builder_id = owner.id 
  AND owner.role = 'owner'
  AND users.company_name IS NULL;