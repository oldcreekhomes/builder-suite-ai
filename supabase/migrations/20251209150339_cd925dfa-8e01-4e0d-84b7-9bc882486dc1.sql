-- Add display_order column to projects table for manual job ordering
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS display_order integer;

-- Create an index for efficient ordering queries
CREATE INDEX IF NOT EXISTS idx_projects_display_order ON public.projects(display_order);