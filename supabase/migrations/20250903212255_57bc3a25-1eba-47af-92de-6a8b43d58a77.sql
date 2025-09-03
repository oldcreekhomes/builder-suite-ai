
-- 1) Rename companies.owner_id -> companies.home_builder_id
ALTER TABLE public.companies
RENAME COLUMN owner_id TO home_builder_id;

-- Helpful index for scoping
CREATE INDEX IF NOT EXISTS companies_home_builder_id_idx
  ON public.companies(home_builder_id);

-- 2) Backfill company home_builder_id: if it points to an employee, convert to the employee's owner (home builder)
UPDATE public.companies c
SET home_builder_id = u.home_builder_id
FROM public.users u
WHERE c.home_builder_id = u.id
  AND u.role = 'employee'
  AND u.home_builder_id IS NOT NULL;

-- Optional safety for this workspace (assign any remaining NULLs to the current home builder)
UPDATE public.companies
SET home_builder_id = '2653aba8-d154-4301-99bf-77d559492e19'
WHERE home_builder_id IS NULL;

-- 3) Add home_builder_id to company_representatives and backfill from companies
ALTER TABLE public.company_representatives
ADD COLUMN IF NOT EXISTS home_builder_id uuid;

UPDATE public.company_representatives cr
SET home_builder_id = c.home_builder_id
FROM public.companies c
WHERE cr.company_id = c.id
  AND (cr.home_builder_id IS NULL OR cr.home_builder_id <> c.home_builder_id);

-- Make it required
ALTER TABLE public.company_representatives
ALTER COLUMN home_builder_id SET NOT NULL;

-- Index for scoping
CREATE INDEX IF NOT EXISTS company_representatives_home_builder_id_idx
  ON public.company_representatives(home_builder_id);

-- 4) Keep reps in sync via trigger (auto-sets home_builder_id from the company on insert/update)
CREATE OR REPLACE FUNCTION public.set_company_representative_home_builder()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF NEW.company_id IS NOT NULL THEN
    SELECT c.home_builder_id
      INTO NEW.home_builder_id
    FROM public.companies c
    WHERE c.id = NEW.company_id;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_set_company_rep_home_builder ON public.company_representatives;

CREATE TRIGGER trg_set_company_rep_home_builder
BEFORE INSERT OR UPDATE ON public.company_representatives
FOR EACH ROW
EXECUTE FUNCTION public.set_company_representative_home_builder();

-- 5) Update RLS to be scoped by home_builder (owner or confirmed employee)
-- Companies
DROP POLICY IF EXISTS "Company users can access all company data" ON public.companies;

CREATE POLICY "Companies scoped to home builder"
ON public.companies
FOR ALL
USING (
  home_builder_id = auth.uid()
  OR home_builder_id IN (
    SELECT u.home_builder_id
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.confirmed = true
      AND u.role = 'employee'
  )
)
WITH CHECK (
  home_builder_id = auth.uid()
  OR home_builder_id IN (
    SELECT u.home_builder_id
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.confirmed = true
      AND u.role = 'employee'
  )
);

-- Company Representatives
DROP POLICY IF EXISTS "Company users can access all company data" ON public.company_representatives;

CREATE POLICY "Company reps scoped to home builder"
ON public.company_representatives
FOR ALL
USING (
  home_builder_id = auth.uid()
  OR home_builder_id IN (
    SELECT u.home_builder_id
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.confirmed = true
      AND u.role = 'employee'
  )
)
WITH CHECK (
  home_builder_id = auth.uid()
  OR home_builder_id IN (
    SELECT u.home_builder_id
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.confirmed = true
      AND u.role = 'employee'
  )
);

-- 6) Update billing validation function to use companies.home_builder_id
CREATE OR REPLACE FUNCTION public.validate_bill_vendor_owner()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_owner uuid;
begin
  select home_builder_id into v_owner
  from public.companies
  where id = new.vendor_id;

  if v_owner is null or v_owner <> new.owner_id then
    raise exception 'Vendor does not belong to this home builder/company';
  end if;

  return new;
end;
$function$;
