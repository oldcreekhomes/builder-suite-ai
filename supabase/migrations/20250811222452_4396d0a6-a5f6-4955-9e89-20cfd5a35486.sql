-- Create a function to mark employee as confirmed after password reset
CREATE OR REPLACE FUNCTION public.mark_employee_confirmed_on_auth()
RETURNS TRIGGER AS $$
BEGIN
  -- Only for employees who just had their password updated
  IF OLD.encrypted_password IS DISTINCT FROM NEW.encrypted_password 
     AND NEW.email_confirmed_at IS NOT NULL THEN
    
    -- Update the public.users table to mark employee as confirmed
    UPDATE public.users 
    SET confirmed = true, updated_at = NOW()
    WHERE id = NEW.id 
      AND role = 'employee' 
      AND confirmed = false;
      
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically confirm employees after password reset
CREATE TRIGGER mark_employee_confirmed_trigger
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.mark_employee_confirmed_on_auth();