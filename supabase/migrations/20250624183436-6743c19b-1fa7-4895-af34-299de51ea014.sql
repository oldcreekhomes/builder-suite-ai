

-- Create a function to handle user creation from confirmed invitations
CREATE OR REPLACE FUNCTION public.create_user_from_invitation(
  p_invitation_id UUID,
  p_password TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invitation_record RECORD;
  existing_user_id UUID;
  new_user_id UUID;
BEGIN
  -- Get the confirmed invitation
  SELECT * INTO invitation_record
  FROM public.employee_invitations
  WHERE id = p_invitation_id
    AND status = 'confirmed'
    AND expires_at > NOW();
  
  IF invitation_record IS NULL THEN
    RAISE EXCEPTION 'Invalid invitation';
  END IF;
  
  -- Check if user already exists
  SELECT id INTO existing_user_id 
  FROM auth.users 
  WHERE email = invitation_record.email;
  
  IF existing_user_id IS NOT NULL THEN
    -- User exists, just update their profile to link them as an employee
    -- First update their auth metadata
    UPDATE auth.users 
    SET raw_user_meta_data = jsonb_build_object(
      'user_type', 'employee',
      'first_name', invitation_record.first_name,
      'last_name', invitation_record.last_name,
      'phone_number', invitation_record.phone_number,
      'role', invitation_record.role,
      'home_builder_id', invitation_record.home_builder_id::text
    ),
    updated_at = NOW()
    WHERE id = existing_user_id;
    
    -- Then update their profile in the profiles table
    UPDATE public.profiles
    SET user_type = 'employee',
        first_name = invitation_record.first_name,
        last_name = invitation_record.last_name,
        phone_number = invitation_record.phone_number,
        role = invitation_record.role,
        home_builder_id = invitation_record.home_builder_id,
        approved_by_home_builder = true,
        updated_at = NOW()
    WHERE id = existing_user_id;
    
    new_user_id := existing_user_id;
  ELSE
    -- User doesn't exist, we need to create them through Supabase Auth
    -- This should not happen in the invitation flow, but let's handle it
    RAISE EXCEPTION 'User does not exist. Please sign up first before accepting invitation.';
  END IF;
  
  -- Update invitation status
  UPDATE public.employee_invitations
  SET status = 'accepted',
      accepted_at = NOW()
  WHERE id = invitation_record.id;
  
  RETURN jsonb_build_object(
    'user_id', new_user_id,
    'email', invitation_record.email,
    'success', true
  );
END;
$$;

