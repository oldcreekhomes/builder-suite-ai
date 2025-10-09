-- Drop the restrictive policy that prevents role changes
DROP POLICY IF EXISTS "Owners can manage their employees" ON public.users;

-- Create updated policy that allows owners to set any role for their employees
CREATE POLICY "Owners can manage their employees"
ON public.users
FOR UPDATE
TO public
USING (
  (auth.uid() = id) 
  OR 
  (EXISTS (
    SELECT 1 
    FROM users owner 
    WHERE owner.id = auth.uid() 
      AND owner.role = 'owner' 
      AND owner.company_name = users.company_name
  ))
)
WITH CHECK (
  (auth.uid() = id)
  OR
  (EXISTS (
    SELECT 1 
    FROM users owner 
    WHERE owner.id = auth.uid() 
      AND owner.role = 'owner' 
      AND owner.company_name = users.company_name
  ))
);