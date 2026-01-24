-- Add archived_at column for soft delete
ALTER TABLE public.companies 
ADD COLUMN archived_at timestamp with time zone DEFAULT NULL;

-- Add archived_by column to track who archived it
ALTER TABLE public.companies 
ADD COLUMN archived_by uuid DEFAULT NULL;

-- Create index for efficient filtering of active companies
CREATE INDEX idx_companies_archived_at ON public.companies(archived_at) 
WHERE archived_at IS NULL;