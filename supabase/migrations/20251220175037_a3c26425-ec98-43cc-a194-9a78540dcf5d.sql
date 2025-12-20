-- Add accounting_software column to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS accounting_software text DEFAULT NULL;