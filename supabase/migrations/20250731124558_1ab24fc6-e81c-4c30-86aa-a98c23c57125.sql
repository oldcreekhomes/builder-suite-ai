-- Create company_issues table for tracking issues across the company
CREATE TABLE public.company_issues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('Messages', 'Files', 'Photos', 'Budget', 'Bidding', 'Schedule')),
  status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Resolved')),
  priority TEXT NOT NULL DEFAULT 'Normal' CHECK (priority IN ('Normal', 'High')),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.company_issues ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for company users to manage their issues
CREATE POLICY "Company users can manage their issues" 
ON public.company_issues 
FOR ALL 
USING (company_name = get_current_user_company())
WITH CHECK (company_name = get_current_user_company());

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_company_issues_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_company_issues_updated_at
BEFORE UPDATE ON public.company_issues
FOR EACH ROW
EXECUTE FUNCTION public.update_company_issues_updated_at();

-- Create index for better performance
CREATE INDEX idx_company_issues_company_name ON public.company_issues(company_name);
CREATE INDEX idx_company_issues_category ON public.company_issues(category);
CREATE INDEX idx_company_issues_status ON public.company_issues(status);
CREATE INDEX idx_company_issues_priority ON public.company_issues(priority);