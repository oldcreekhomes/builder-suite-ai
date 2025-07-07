-- DELETE ALL the complex policies I created that are causing problems
DROP POLICY IF EXISTS "Employees can view all employees from their company" ON public.employees;
DROP POLICY IF EXISTS "Employees can view colleagues from same home builder" ON public.employees;
DROP POLICY IF EXISTS "Employees can view employees from same home builder" ON public.employees;
DROP FUNCTION IF EXISTS public.get_employee_home_builder_id(UUID);
DROP FUNCTION IF EXISTS public.get_user_home_builder_id();

-- Go back to the ORIGINAL simple policies that were working
-- These are the ONLY policies the employees table should have:

-- 1. Home builders can manage their employees (this was working)
-- 2. Employees can view their own record (this was working)