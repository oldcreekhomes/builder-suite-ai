
-- Create projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  status TEXT NOT NULL,
  manager TEXT NOT NULL,
  owner_id UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create project photos table
CREATE TABLE public.project_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  uploaded_by UUID REFERENCES public.profiles(id) NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create project schedule table
CREATE TABLE public.project_schedule (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  task_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  assigned_to TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_schedule ENABLE ROW LEVEL SECURITY;

-- RLS policies for projects
CREATE POLICY "Users can view projects they own or are assigned to" ON public.projects
  FOR SELECT USING (
    owner_id = auth.uid() OR 
    owner_id IN (
      SELECT home_builder_id FROM public.profiles 
      WHERE id = auth.uid() AND approved_by_home_builder = true
    )
  );

CREATE POLICY "Users can create their own projects" ON public.projects
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own projects" ON public.projects
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can delete their own projects" ON public.projects
  FOR DELETE USING (owner_id = auth.uid());

-- RLS policies for project photos
CREATE POLICY "Users can view photos for accessible projects" ON public.project_photos
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM public.projects WHERE 
      owner_id = auth.uid() OR 
      owner_id IN (
        SELECT home_builder_id FROM public.profiles 
        WHERE id = auth.uid() AND approved_by_home_builder = true
      )
    )
  );

CREATE POLICY "Users can upload photos to accessible projects" ON public.project_photos
  FOR INSERT WITH CHECK (
    uploaded_by = auth.uid() AND
    project_id IN (
      SELECT id FROM public.projects WHERE 
      owner_id = auth.uid() OR 
      owner_id IN (
        SELECT home_builder_id FROM public.profiles 
        WHERE id = auth.uid() AND approved_by_home_builder = true
      )
    )
  );

-- RLS policies for project schedule
CREATE POLICY "Users can view schedule for accessible projects" ON public.project_schedule
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM public.projects WHERE 
      owner_id = auth.uid() OR 
      owner_id IN (
        SELECT home_builder_id FROM public.profiles 
        WHERE id = auth.uid() AND approved_by_home_builder = true
      )
    )
  );

CREATE POLICY "Users can manage schedule for their projects" ON public.project_schedule
  FOR ALL USING (
    project_id IN (
      SELECT id FROM public.projects WHERE owner_id = auth.uid()
    )
  );
