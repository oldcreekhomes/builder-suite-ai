-- Update Raymond Zins password directly
UPDATE auth.users 
SET encrypted_password = crypt('TempPassword123!', gen_salt('bf'))
WHERE email = 'rzins@oldcreekhomes.com';