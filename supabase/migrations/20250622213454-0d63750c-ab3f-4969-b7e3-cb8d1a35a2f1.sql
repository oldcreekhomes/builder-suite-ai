
-- Add invitation token and confirmation fields to employee_invitations table
ALTER TABLE public.employee_invitations 
ADD COLUMN invitation_token UUID DEFAULT gen_random_uuid(),
ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '7 days'),
ADD COLUMN confirmed_at TIMESTAMP WITH TIME ZONE;

-- Update status check constraint to include 'confirmed'
ALTER TABLE public.employee_invitations 
DROP CONSTRAINT IF EXISTS employee_invitations_status_check;

ALTER TABLE public.employee_invitations 
ADD CONSTRAINT employee_invitations_status_check 
CHECK (status IN ('pending', 'confirmed', 'accepted', 'expired'));

-- Create function to confirm invitation
CREATE OR REPLACE FUNCTION public.confirm_invitation(token UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invitation_record RECORD;
  new_user_id UUID;
BEGIN
  -- Find the invitation
  SELECT * INTO invitation_record
  FROM public.employee_invitations
  WHERE invitation_token = token
    AND expires_at > NOW()
    AND status = 'pending';
  
  IF invitation_record IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invitation token';
  END IF;
  
  -- Create the user account
  INSERT INTO auth.users (
    email,
    email_confirmed_at,
    raw_user_meta_data
  ) VALUES (
    invitation_record.email,
    NOW(),
    jsonb_build_object(
      'user_type', 'employee',
      'first_name', invitation_record.first_name,
      'last_name', invitation_record.last_name,
      'phone_number', invitation_record.phone_number,
      'role', invitation_record.role,
      'home_builder_id', invitation_record.home_builder_id
    )
  ) RETURNING id INTO new_user_id;
  
  -- Update invitation status
  UPDATE public.employee_invitations
  SET status = 'confirmed',
      confirmed_at = NOW(),
      accepted_at = NOW()
  WHERE id = invitation_record.id;
  
  RETURN new_user_id;
END;
$$;
