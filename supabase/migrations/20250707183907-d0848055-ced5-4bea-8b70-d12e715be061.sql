-- Remove the policy causing infinite recursion 
DROP POLICY IF EXISTS "Employees can view all employees from their company" ON public.employees;

-- Keep only the working policies:
-- 1. "Home builders can manage their employees" (already exists - works)
-- 2. "Employees can view their own record" (already exists - works)

-- The issue is that employees need to see OTHER employees for the employee management page
-- Let's add employee permissions to ALL other tables, but handle employee management differently