-- Create Jole Ann's authentication account in the auth.users table
-- First we need to insert her into the users table so she can actually log in

INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  is_super_admin,
  role
) VALUES (
  '274620ea-36ee-4ab8-898f-df41dff97740'::uuid,
  'ap@oldcreekhomes.com',
  crypt('temporarypassword123', gen_salt('bf')), -- She'll need to reset this
  now(),
  now(),
  now(),
  '{"first_name": "Jole Ann", "last_name": "Sorensen"}'::jsonb,
  false,
  'authenticated'
) ON CONFLICT (id) DO NOTHING;