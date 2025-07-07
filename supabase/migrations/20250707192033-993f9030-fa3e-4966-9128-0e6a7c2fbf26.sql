-- Step 1: Add employee-specific fields to home_builders table
ALTER TABLE public.home_builders 
ADD COLUMN IF NOT EXISTS confirmed boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS role text DEFAULT 'employee',
ADD COLUMN IF NOT EXISTS home_builder_id uuid REFERENCES public.home_builders(id);

-- Step 2: Migrate remaining employee data to home_builders
-- Update existing employee records in home_builders with employee-specific data
UPDATE public.home_builders hb 
SET 
  confirmed = e.confirmed,
  role = e.role,
  home_builder_id = e.home_builder_id,
  first_name = COALESCE(hb.first_name, e.first_name),
  last_name = COALESCE(hb.last_name, e.last_name),
  phone_number = COALESCE(hb.phone_number, e.phone_number)
FROM public.employees e 
WHERE hb.id = e.id AND hb.user_type = 'employee';

-- Step 3: Insert any employees who don't have auth accounts into home_builders as data-only records
-- These will be employees without login capability
INSERT INTO public.home_builders (id, email, first_name, last_name, user_type, confirmed, role, home_builder_id, created_at, updated_at)
SELECT 
  e.id,
  e.email,
  e.first_name,
  e.last_name,
  'employee'::public.user_type,
  e.confirmed,
  e.role,
  e.home_builder_id,
  e.created_at,
  e.updated_at
FROM public.employees e
WHERE NOT EXISTS (
  SELECT 1 FROM public.home_builders hb WHERE hb.id = e.id
);

-- Step 4: Update functions that reference employees table
-- Update get_current_user_home_builder_id function
CREATE OR REPLACE FUNCTION public.get_current_user_home_builder_id()
RETURNS UUID AS $$
BEGIN
  -- Check if current user is an employee and return their home_builder_id
  RETURN (
    SELECT home_builder_id 
    FROM public.home_builders 
    WHERE id = auth.uid() 
    AND user_type = 'employee' 
    AND home_builder_id IS NOT NULL
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_pending_employee_approvals function  
CREATE OR REPLACE FUNCTION public.get_pending_employee_approvals()
RETURNS TABLE(id uuid, email text, company_name text, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    hb.id,
    hb.email,
    home_builder.company_name,
    hb.created_at
  FROM public.home_builders hb
  JOIN public.home_builders home_builder ON hb.home_builder_id = home_builder.id
  WHERE hb.user_type = 'employee' 
    AND hb.confirmed = false
    AND home_builder.id = auth.uid();
END;
$$;

-- Update approve_employee function
CREATE OR REPLACE FUNCTION public.approve_employee(employee_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the current user is the home builder for this employee
  IF EXISTS (
    SELECT 1 FROM public.home_builders 
    WHERE id = employee_id 
      AND home_builder_id = auth.uid()
      AND user_type = 'employee'
  ) THEN
    UPDATE public.home_builders 
    SET confirmed = true,
        updated_at = NOW()
    WHERE id = employee_id;
    
    -- Also update the employees table record for the employee to confirmed = true
    UPDATE public.employees 
    SET confirmed = true,
        updated_at = NOW()
    WHERE id = employee_id;
  ELSE
    RAISE EXCEPTION 'Unauthorized: You can only approve your own employees';
  END IF;
END;
$$;