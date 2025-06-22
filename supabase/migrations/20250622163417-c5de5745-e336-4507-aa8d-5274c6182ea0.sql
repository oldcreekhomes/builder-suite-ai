
-- Delete all profiles first (due to foreign key constraints)
DELETE FROM public.profiles;

-- Delete all users from auth.users table
DELETE FROM auth.users;
