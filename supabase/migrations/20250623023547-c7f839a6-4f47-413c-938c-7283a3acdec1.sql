
-- Create the project_schedule_tasks table for the Gantt chart functionality
CREATE TABLE public.project_schedule_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  task_code TEXT NOT NULL,
  task_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration INTEGER NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  resources TEXT[] DEFAULT '{}',
  predecessor_id UUID REFERENCES public.project_schedule_tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security
ALTER TABLE public.project_schedule_tasks ENABLE ROW LEVEL SECURITY;

-- Create policies for project schedule tasks
CREATE POLICY "Users can view project schedule tasks for their projects" 
  ON public.project_schedule_tasks 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = project_schedule_tasks.project_id 
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create project schedule tasks for their projects" 
  ON public.project_schedule_tasks 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = project_schedule_tasks.project_id 
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update project schedule tasks for their projects" 
  ON public.project_schedule_tasks 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = project_schedule_tasks.project_id 
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete project schedule tasks for their projects" 
  ON public.project_schedule_tasks 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = project_schedule_tasks.project_id 
      AND projects.owner_id = auth.uid()
    )
  );
