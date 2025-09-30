-- Create the update function first
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create table to store company check settings per project
CREATE TABLE public.project_check_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  company_name TEXT,
  company_address TEXT,
  company_city_state TEXT,
  last_check_number INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, owner_id)
);

-- Enable Row Level Security
ALTER TABLE public.project_check_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for project check settings
CREATE POLICY "Users can view their own project check settings" 
ON public.project_check_settings 
FOR SELECT 
USING (
  owner_id = auth.uid() OR 
  owner_id = (
    SELECT home_builder_id 
    FROM public.users 
    WHERE id = auth.uid() AND role = 'employee'
  )
);

CREATE POLICY "Users can insert their own project check settings" 
ON public.project_check_settings 
FOR INSERT 
WITH CHECK (
  owner_id = auth.uid() OR 
  owner_id = (
    SELECT home_builder_id 
    FROM public.users 
    WHERE id = auth.uid() AND role = 'employee'
  )
);

CREATE POLICY "Users can update their own project check settings" 
ON public.project_check_settings 
FOR UPDATE 
USING (
  owner_id = auth.uid() OR 
  owner_id = (
    SELECT home_builder_id 
    FROM public.users 
    WHERE id = auth.uid() AND role = 'employee'
  )
);

-- Create trigger to update timestamps
CREATE TRIGGER update_project_check_settings_updated_at
BEFORE UPDATE ON public.project_check_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();