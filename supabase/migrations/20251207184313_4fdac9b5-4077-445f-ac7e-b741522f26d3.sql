-- Add statement_date column to project_files table for bank statements
ALTER TABLE public.project_files
ADD COLUMN statement_date DATE;