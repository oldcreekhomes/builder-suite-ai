-- Add RLS policy for owners to delete their employees
CREATE POLICY "Owners can delete their employees"
ON public.users
FOR DELETE
USING (
  -- Must be called by an owner
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'owner'
  )
  -- Cannot delete owners
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = users.id AND role = 'owner'
  )
  -- Can only delete employees under their company
  AND home_builder_id = auth.uid()
  -- Cannot delete self
  AND id != auth.uid()
);