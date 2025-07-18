
-- First, let's check if the task_dependencies table already exists and update it if needed
-- Drop and recreate task_dependencies table with proper structure
DROP TABLE IF EXISTS public.task_dependencies CASCADE;

CREATE TABLE public.task_dependencies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_task_id UUID NOT NULL REFERENCES public.project_schedule_tasks(id) ON DELETE CASCADE,
  target_task_id UUID NOT NULL REFERENCES public.project_schedule_tasks(id) ON DELETE CASCADE,
  dependency_type TEXT NOT NULL DEFAULT 'finish_to_start',
  lag_days INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(source_task_id, target_task_id)
);

-- Enable RLS
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for task_dependencies
CREATE POLICY "Company users can access all dependency data" 
  ON public.task_dependencies 
  FOR ALL 
  USING (get_current_user_company() IS NOT NULL)
  WITH CHECK (get_current_user_company() IS NOT NULL);

-- Drop and recreate project_resources table with proper structure
DROP TABLE IF EXISTS public.project_resources CASCADE;

CREATE TABLE public.project_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  resource_name TEXT NOT NULL,
  resource_type TEXT NOT NULL DEFAULT 'person',
  email TEXT,
  hourly_rate NUMERIC,
  availability_percent INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_resources ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for project_resources
CREATE POLICY "Company users can access all resource data" 
  ON public.project_resources 
  FOR ALL 
  USING (get_current_user_company() IS NOT NULL)
  WITH CHECK (get_current_user_company() IS NOT NULL);

-- Update project_schedule_tasks table to use proper TIMESTAMP WITH TIME ZONE for dates
-- and ensure all required fields are present
ALTER TABLE public.project_schedule_tasks 
  ALTER COLUMN start_date TYPE TIMESTAMP WITH TIME ZONE USING start_date::timestamp with time zone,
  ALTER COLUMN end_date TYPE TIMESTAMP WITH TIME ZONE USING end_date::timestamp with time zone;

-- Add updated_at triggers for the new tables
CREATE TRIGGER update_task_dependencies_updated_at
  BEFORE UPDATE ON public.task_dependencies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_schedule_tasks_updated_at();

CREATE TRIGGER update_project_resources_updated_at
  BEFORE UPDATE ON public.project_resources
  FOR EACH ROW
  EXECUTE FUNCTION public.update_schedule_tasks_updated_at();

-- Create indexes for better performance
CREATE INDEX idx_task_dependencies_source_task_id ON public.task_dependencies(source_task_id);
CREATE INDEX idx_task_dependencies_target_task_id ON public.task_dependencies(target_task_id);
CREATE INDEX idx_project_resources_project_id ON public.project_resources(project_id);
