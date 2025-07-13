-- Drop the old owners and employees tables since we've migrated to unified users table
DROP TABLE IF EXISTS public.employees CASCADE;
DROP TABLE IF EXISTS public.owners CASCADE;