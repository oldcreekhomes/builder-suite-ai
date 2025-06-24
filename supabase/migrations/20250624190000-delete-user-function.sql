
-- Create a function to delete users from auth.users (requires service role)
CREATE OR REPLACE FUNCTION public.delete_user_account(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only allow home builders to delete employee accounts they invited
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id 
    AND (home_builder_id = auth.uid() OR id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Unauthorized: You can only delete your own employees or your own account';
  END IF;
  
  -- Delete from auth.users (this will cascade to profiles due to foreign key)
  DELETE FROM auth.users WHERE id = user_id;
END;
$$;
