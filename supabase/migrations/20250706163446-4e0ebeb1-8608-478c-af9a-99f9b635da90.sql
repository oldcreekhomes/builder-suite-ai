-- Create project bidding bid packages table
CREATE TABLE public.project_bidding_bid_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  cost_code_id UUID NOT NULL REFERENCES public.cost_codes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'closed')),
  due_date TIMESTAMP WITH TIME ZONE,
  reminder_date TIMESTAMP WITH TIME ZONE,
  reminder_day_of_week INTEGER CHECK (reminder_day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 1=Monday, etc.
  specifications TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on bid packages
ALTER TABLE public.project_bidding_bid_packages ENABLE ROW LEVEL SECURITY;

-- Create policies for bid packages
CREATE POLICY "Users can view bid packages for their projects" 
ON public.project_bidding_bid_packages 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.projects 
  WHERE projects.id = project_bidding_bid_packages.project_id 
  AND projects.owner_id = auth.uid()
));

CREATE POLICY "Users can create bid packages for their projects" 
ON public.project_bidding_bid_packages 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.projects 
  WHERE projects.id = project_bidding_bid_packages.project_id 
  AND projects.owner_id = auth.uid()
));

CREATE POLICY "Users can update bid packages for their projects" 
ON public.project_bidding_bid_packages 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.projects 
  WHERE projects.id = project_bidding_bid_packages.project_id 
  AND projects.owner_id = auth.uid()
));

CREATE POLICY "Users can delete bid packages for their projects" 
ON public.project_bidding_bid_packages 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.projects 
  WHERE projects.id = project_bidding_bid_packages.project_id 
  AND projects.owner_id = auth.uid()
));

-- Create junction table for bid package companies
CREATE TABLE public.project_bidding_bid_package_companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bid_package_id UUID NOT NULL REFERENCES public.project_bidding_bid_packages(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  bid_status TEXT NOT NULL DEFAULT 'will_bid' CHECK (bid_status IN ('will_bid', 'will_not_bid')),
  price NUMERIC,
  proposals TEXT[],
  due_date TIMESTAMP WITH TIME ZONE,
  reminder_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(bid_package_id, company_id)
);

-- Enable RLS on bid package companies
ALTER TABLE public.project_bidding_bid_package_companies ENABLE ROW LEVEL SECURITY;

-- Create policies for bid package companies
CREATE POLICY "Users can view bid package companies for their projects" 
ON public.project_bidding_bid_package_companies 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.project_bidding_bid_packages bp
  JOIN public.projects p ON bp.project_id = p.id
  WHERE bp.id = project_bidding_bid_package_companies.bid_package_id 
  AND p.owner_id = auth.uid()
));

CREATE POLICY "Users can create bid package companies for their projects" 
ON public.project_bidding_bid_package_companies 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.project_bidding_bid_packages bp
  JOIN public.projects p ON bp.project_id = p.id
  WHERE bp.id = project_bidding_bid_package_companies.bid_package_id 
  AND p.owner_id = auth.uid()
));

CREATE POLICY "Users can update bid package companies for their projects" 
ON public.project_bidding_bid_package_companies 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.project_bidding_bid_packages bp
  JOIN public.projects p ON bp.project_id = p.id
  WHERE bp.id = project_bidding_bid_package_companies.bid_package_id 
  AND p.owner_id = auth.uid()
));

CREATE POLICY "Users can delete bid package companies for their projects" 
ON public.project_bidding_bid_package_companies 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.project_bidding_bid_packages bp
  JOIN public.projects p ON bp.project_id = p.id
  WHERE bp.id = project_bidding_bid_package_companies.bid_package_id 
  AND p.owner_id = auth.uid()
));

-- Create bid package files table
CREATE TABLE public.project_bidding_bid_package_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bid_package_id UUID NOT NULL REFERENCES public.project_bidding_bid_packages(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on bid package files
ALTER TABLE public.project_bidding_bid_package_files ENABLE ROW LEVEL SECURITY;

-- Create policies for bid package files
CREATE POLICY "Users can view bid package files for their projects" 
ON public.project_bidding_bid_package_files 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.project_bidding_bid_packages bp
  JOIN public.projects p ON bp.project_id = p.id
  WHERE bp.id = project_bidding_bid_package_files.bid_package_id 
  AND p.owner_id = auth.uid()
));

CREATE POLICY "Users can upload bid package files for their projects" 
ON public.project_bidding_bid_package_files 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.project_bidding_bid_packages bp
  JOIN public.projects p ON bp.project_id = p.id
  WHERE bp.id = project_bidding_bid_package_files.bid_package_id 
  AND p.owner_id = auth.uid()
) AND uploaded_by = auth.uid());

CREATE POLICY "Users can delete bid package files for their projects" 
ON public.project_bidding_bid_package_files 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.project_bidding_bid_packages bp
  JOIN public.projects p ON bp.project_id = p.id
  WHERE bp.id = project_bidding_bid_package_files.bid_package_id 
  AND p.owner_id = auth.uid()
));

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_bid_package_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_bid_packages_updated_at
  BEFORE UPDATE ON public.project_bidding_bid_packages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_bid_package_updated_at();

CREATE TRIGGER update_bid_package_companies_updated_at
  BEFORE UPDATE ON public.project_bidding_bid_package_companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_bid_package_updated_at();