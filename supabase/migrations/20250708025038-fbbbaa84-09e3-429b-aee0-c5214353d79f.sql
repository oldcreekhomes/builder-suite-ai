-- Create project_schedule_tasks table for Gantt chart functionality
CREATE TABLE public.project_schedule_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration INTEGER NOT NULL DEFAULT 1,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  assigned_to TEXT,
  dependencies TEXT[] DEFAULT '{}',
  color TEXT DEFAULT '#3b82f6',
  parent_id UUID REFERENCES project_schedule_tasks(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security
ALTER TABLE public.project_schedule_tasks ENABLE ROW LEVEL SECURITY;

-- Create policies for project_schedule_tasks
CREATE POLICY "Users can view schedule tasks for their projects" 
  ON public.project_schedule_tasks 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_schedule_tasks.project_id 
      AND (
        projects.owner_id = auth.uid()
        OR projects.owner_id IN (
          SELECT employees.home_builder_id
          FROM employees
          WHERE employees.id = auth.uid() AND employees.confirmed = true
        )
      )
    )
  );

CREATE POLICY "Users can create schedule tasks for their projects" 
  ON public.project_schedule_tasks 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_schedule_tasks.project_id 
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update schedule tasks for their projects" 
  ON public.project_schedule_tasks 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_schedule_tasks.project_id 
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete schedule tasks for their projects" 
  ON public.project_schedule_tasks 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_schedule_tasks.project_id 
      AND projects.owner_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_project_schedule_tasks_project_id ON public.project_schedule_tasks(project_id);
CREATE INDEX idx_project_schedule_tasks_parent_id ON public.project_schedule_tasks(parent_id);
CREATE INDEX idx_project_schedule_tasks_start_date ON public.project_schedule_tasks(start_date);
CREATE INDEX idx_project_schedule_tasks_end_date ON public.project_schedule_tasks(end_date);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_schedule_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_project_schedule_tasks_updated_at
  BEFORE UPDATE ON public.project_schedule_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_schedule_tasks_updated_at();