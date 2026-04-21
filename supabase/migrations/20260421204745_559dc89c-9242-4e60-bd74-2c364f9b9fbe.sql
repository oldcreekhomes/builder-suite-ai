-- 1. Fix get_current_user_home_builder_id: return home_builder_id for ANY confirmed company member
CREATE OR REPLACE FUNCTION public.get_current_user_home_builder_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT home_builder_id 
  FROM public.users 
  WHERE id = auth.uid() 
    AND confirmed = true
    AND home_builder_id IS NOT NULL
  LIMIT 1;
$function$;

-- 2. Fix get_current_user_home_builder_info: is_employee = any confirmed company member
CREATE OR REPLACE FUNCTION public.get_current_user_home_builder_info()
RETURNS TABLE(is_employee boolean, home_builder_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT 
    (confirmed = true AND home_builder_id IS NOT NULL) as is_employee,
    home_builder_id
  FROM public.users 
  WHERE id = auth.uid()
  LIMIT 1;
$function$;

-- 3. Normalize cost_codes RLS: tenant-based access
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'cost_codes'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.cost_codes', pol.policyname);
  END LOOP;
END $$;

ALTER TABLE public.cost_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view cost codes"
ON public.cost_codes FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
  OR owner_id = public.get_current_user_home_builder_id()
);

CREATE POLICY "Tenant members can insert cost codes"
ON public.cost_codes FOR INSERT
TO authenticated
WITH CHECK (
  owner_id = auth.uid()
  OR owner_id = public.get_current_user_home_builder_id()
);

CREATE POLICY "Tenant members can update cost codes"
ON public.cost_codes FOR UPDATE
TO authenticated
USING (
  owner_id = auth.uid()
  OR owner_id = public.get_current_user_home_builder_id()
)
WITH CHECK (
  owner_id = auth.uid()
  OR owner_id = public.get_current_user_home_builder_id()
);

CREATE POLICY "Tenant members can delete cost codes"
ON public.cost_codes FOR DELETE
TO authenticated
USING (
  owner_id = auth.uid()
  OR owner_id = public.get_current_user_home_builder_id()
);