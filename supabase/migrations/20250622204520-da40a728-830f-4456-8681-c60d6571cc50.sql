
-- Add missing columns to the profiles table for user profile functionality
ALTER TABLE public.profiles 
ADD COLUMN first_name TEXT,
ADD COLUMN last_name TEXT,
ADD COLUMN avatar_url TEXT;
