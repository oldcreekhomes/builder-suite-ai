
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
  profile_exists BOOLEAN;
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
    -- User exists, update their profile to link them as an employee
    
    -- Check if profile exists
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = existing_user_id) INTO profile_exists;
    
    -- Update their auth metadata
    UPDATE auth.users 
    SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
      'user_type', 'employee',
      'first_name', invitation_record.first_name,
      'last_name', invitation_record.last_name,
      'phone_number', invitation_record.phone_number,
      'role', invitation_record.role,
      'home_builder_id', invitation_record.home_builder_id::text
    ),
    updated_at = NOW()
    WHERE id = existing_user_id;
    
    -- Update or insert their profile in the profiles table
    IF profile_exists THEN
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
    ELSE
      INSERT INTO public.profiles (
        id, email, user_type, first_name, last_name, phone_number, role, 
        home_builder_id, approved_by_home_builder
      ) VALUES (
        existing_user_id, invitation_record.email, 'employee', 
        invitation_record.first_name, invitation_record.last_name, 
        invitation_record.phone_number, invitation_record.role,
        invitation_record.home_builder_id, true
      );
    END IF;
    
    new_user_id := existing_user_id;
  ELSE
    -- User doesn't exist, they need to sign up first
    RAISE EXCEPTION 'Please sign up for an account first, then accept the invitation again.';
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
