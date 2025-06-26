
-- Create project_schedule_tasks table for storing Gantt chart tasks
CREATE TABLE public.project_schedule_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_name TEXT NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration INTEGER DEFAULT 1,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  predecessor TEXT,
  resources TEXT,
  notes TEXT,
  parent_id UUID REFERENCES project_schedule_tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security
ALTER TABLE public.project_schedule_tasks ENABLE ROW LEVEL SECURITY;

-- Create policies for project_schedule_tasks
-- Users can view tasks for projects they own or have access to
CREATE POLICY "Users can view project schedule tasks for their projects" 
  ON public.project_schedule_tasks 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_schedule_tasks.project_id 
      AND projects.owner_id = auth.uid()
    )
  );

-- Users can create tasks for projects they own
CREATE POLICY "Users can create project schedule tasks for their projects" 
  ON public.project_schedule_tasks 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_schedule_tasks.project_id 
      AND projects.owner_id = auth.uid()
    )
  );

-- Users can update tasks for projects they own
CREATE POLICY "Users can update project schedule tasks for their projects" 
  ON public.project_schedule_tasks 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_schedule_tasks.project_id 
      AND projects.owner_id = auth.uid()
    )
  );

-- Users can delete tasks for projects they own
CREATE POLICY "Users can delete project schedule tasks for their projects" 
  ON public.project_schedule_tasks 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_schedule_tasks.project_id 
      AND projects.owner_id = auth.uid()
    )
  );

-- Create index for better performance
CREATE INDEX idx_project_schedule_tasks_project_id ON public.project_schedule_tasks(project_id);
CREATE INDEX idx_project_schedule_tasks_parent_id ON public.project_schedule_tasks(parent_id);
