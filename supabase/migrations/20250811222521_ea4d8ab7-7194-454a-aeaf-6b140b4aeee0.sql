-- Fix security warnings by setting search_path on functions

-- Update the mark_employee_confirmed_on_auth function with proper search_path
CREATE OR REPLACE FUNCTION public.mark_employee_confirmed_on_auth()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = ''
AS $$
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
$$;