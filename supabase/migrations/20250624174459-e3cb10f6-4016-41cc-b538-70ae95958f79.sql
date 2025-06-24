
-- Drop the existing function first
DROP FUNCTION IF EXISTS public.confirm_invitation(uuid);

-- Create the updated confirm_invitation function
CREATE OR REPLACE FUNCTION public.confirm_invitation(token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invitation_record RECORD;
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
  
  -- Update invitation status to confirmed
  UPDATE public.employee_invitations
  SET status = 'confirmed',
      confirmed_at = NOW()
  WHERE id = invitation_record.id;
  
  -- Return the invitation data so the frontend can handle user creation
  RETURN jsonb_build_object(
    'invitation_id', invitation_record.id,
    'email', invitation_record.email,
    'first_name', invitation_record.first_name,
    'last_name', invitation_record.last_name,
    'phone_number', invitation_record.phone_number,
    'role', invitation_record.role,
    'home_builder_id', invitation_record.home_builder_id
  );
END;
$$;
