-- Rename users table to owners for clarity
ALTER TABLE public.users RENAME TO owners;

-- Update the foreign key constraint in cost_codes table
ALTER TABLE public.cost_codes DROP CONSTRAINT IF EXISTS cost_codes_owner_id_fkey;
ALTER TABLE public.cost_codes ADD CONSTRAINT cost_codes_owner_id_fkey 
  FOREIGN KEY (owner_id) REFERENCES public.owners(id);

-- Drop all existing policies on employees table
DROP POLICY IF EXISTS "Home builders can manage their employees" ON public.employees;
DROP POLICY IF EXISTS "Employees can access employee records" ON public.employees;
DROP POLICY IF EXISTS "Employees can update their own record" ON public.employees;

-- Create simple, clear policies with the new naming
CREATE POLICY "Owners can manage their employees" 
ON public.employees 
FOR ALL 
USING (home_builder_id = auth.uid())
WITH CHECK (home_builder_id = auth.uid());

CREATE POLICY "Employees can view company employees" 
ON public.employees 
FOR SELECT 
USING (
  -- Employees can see their own record
  id = auth.uid() 
  OR 
  -- Employees can see other employees in their company
  home_builder_id = (
    SELECT home_builder_id 
    FROM public.employees 
    WHERE id = auth.uid() 
    AND confirmed = true
    LIMIT 1
  )
);

CREATE POLICY "Employees can update own record" 
ON public.employees 
FOR UPDATE 
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Update policies on owners table
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.owners;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.owners;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.owners;
DROP POLICY IF EXISTS "Users can view their own profile and employees can view their h" ON public.owners;

CREATE POLICY "Owners can manage their own profile" 
ON public.owners 
FOR ALL 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Employees can view their owner" 
ON public.owners 
FOR SELECT 
USING (
  auth.uid() = id 
  OR 
  id IN (
    SELECT home_builder_id 
    FROM public.employees 
    WHERE id = auth.uid() 
    AND confirmed = true
  )
);