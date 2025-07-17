-- Create task dependencies table for proper link storage
CREATE TABLE IF NOT EXISTS public.task_dependencies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_task_id UUID NOT NULL,
  target_task_id UUID NOT NULL,
  dependency_type TEXT NOT NULL DEFAULT 'finish_to_start',
  lag_days INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(source_task_id, target_task_id)
);

-- Create resources table for team member management
CREATE TABLE IF NOT EXISTS public.project_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  resource_name TEXT NOT NULL,
  resource_type TEXT NOT NULL DEFAULT 'person',
  email TEXT,
  hourly_rate NUMERIC,
  availability_percent INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create task assignments table for resource allocation
CREATE TABLE IF NOT EXISTS public.task_resource_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL,
  resource_id UUID NOT NULL,
  allocation_percent INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(task_id, resource_id)
);

-- Add RLS policies
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_resource_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies for task_dependencies
CREATE POLICY "Company users can access all dependency data" 
ON public.task_dependencies 
FOR ALL 
USING (get_current_user_company() IS NOT NULL)
WITH CHECK (get_current_user_company() IS NOT NULL);

-- RLS policies for project_resources
CREATE POLICY "Company users can access all resource data" 
ON public.project_resources 
FOR ALL 
USING (get_current_user_company() IS NOT NULL)
WITH CHECK (get_current_user_company() IS NOT NULL);

-- RLS policies for task_resource_assignments
CREATE POLICY "Company users can access all assignment data" 
ON public.task_resource_assignments 
FOR ALL 
USING (get_current_user_company() IS NOT NULL)
WITH CHECK (get_current_user_company() IS NOT NULL);

-- Add foreign key relationships
ALTER TABLE public.task_dependencies 
ADD CONSTRAINT task_dependencies_source_task_id_fkey 
FOREIGN KEY (source_task_id) REFERENCES public.project_schedule_tasks(id) ON DELETE CASCADE;

ALTER TABLE public.task_dependencies 
ADD CONSTRAINT task_dependencies_target_task_id_fkey 
FOREIGN KEY (target_task_id) REFERENCES public.project_schedule_tasks(id) ON DELETE CASCADE;

ALTER TABLE public.project_resources 
ADD CONSTRAINT project_resources_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE public.task_resource_assignments 
ADD CONSTRAINT task_resource_assignments_task_id_fkey 
FOREIGN KEY (task_id) REFERENCES public.project_schedule_tasks(id) ON DELETE CASCADE;

ALTER TABLE public.task_resource_assignments 
ADD CONSTRAINT task_resource_assignments_resource_id_fkey 
FOREIGN KEY (resource_id) REFERENCES public.project_resources(id) ON DELETE CASCADE;

-- Add updated_at triggers
CREATE TRIGGER update_task_dependencies_updated_at
  BEFORE UPDATE ON public.task_dependencies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_schedule_tasks_updated_at();

CREATE TRIGGER update_project_resources_updated_at
  BEFORE UPDATE ON public.project_resources
  FOR EACH ROW
  EXECUTE FUNCTION public.update_schedule_tasks_updated_at();

-- Enhance project_schedule_tasks table with additional fields
ALTER TABLE public.project_schedule_tasks 
ADD COLUMN IF NOT EXISTS task_type TEXT DEFAULT 'task',
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS cost_estimate NUMERIC,
ADD COLUMN IF NOT EXISTS actual_cost NUMERIC,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS completion_percentage INTEGER DEFAULT 0;