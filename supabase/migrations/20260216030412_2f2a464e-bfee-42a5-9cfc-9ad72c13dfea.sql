ALTER TABLE public.users DROP CONSTRAINT users_user_type_check;
ALTER TABLE public.users ADD CONSTRAINT users_user_type_check 
  CHECK (user_type = ANY (ARRAY['home_builder', 'marketplace_vendor', 'employee']));