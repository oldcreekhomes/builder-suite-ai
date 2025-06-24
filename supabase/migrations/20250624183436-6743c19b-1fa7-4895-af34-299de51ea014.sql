
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
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = invitation_record.email) THEN
    RAISE EXCEPTION 'User already exists with this email';
  END IF;
  
  -- Create the user in auth.users with confirmed email
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    invitation_record.email,
    crypt(p_password, gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object(
      'user_type', 'employee',
      'first_name', invitation_record.first_name,
      'last_name', invitation_record.last_name,
      'phone_number', invitation_record.phone_number,
      'role', invitation_record.role,
      'home_builder_id', invitation_record.home_builder_id::text
    ),
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  ) RETURNING id INTO new_user_id;
  
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
