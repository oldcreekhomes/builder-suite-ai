
-- Create companies table
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  company_type TEXT NOT NULL CHECK (company_type IN ('Subcontractor', 'Vendor', 'Municipality', 'Consultant')),
  address TEXT,
  website TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create company representatives table
CREATE TABLE public.company_representatives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone_number TEXT,
  title TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create junction table for companies and cost codes
CREATE TABLE public.company_cost_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  cost_code_id UUID NOT NULL REFERENCES public.cost_codes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, cost_code_id)
);

-- Add Row Level Security (RLS)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_representatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_cost_codes ENABLE ROW LEVEL SECURITY;

-- Create policies for companies table
CREATE POLICY "Users can view their own companies" 
  ON public.companies 
  FOR SELECT 
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create their own companies" 
  ON public.companies 
  FOR INSERT 
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own companies" 
  ON public.companies 
  FOR UPDATE 
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own companies" 
  ON public.companies 
  FOR DELETE 
  USING (auth.uid() = owner_id);

-- Create policies for company representatives table
CREATE POLICY "Users can view representatives of their companies" 
  ON public.company_representatives 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.companies 
    WHERE companies.id = company_representatives.company_id 
    AND companies.owner_id = auth.uid()
  ));

CREATE POLICY "Users can create representatives for their companies" 
  ON public.company_representatives 
  FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.companies 
    WHERE companies.id = company_representatives.company_id 
    AND companies.owner_id = auth.uid()
  ));

CREATE POLICY "Users can update representatives of their companies" 
  ON public.company_representatives 
  FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM public.companies 
    WHERE companies.id = company_representatives.company_id 
    AND companies.owner_id = auth.uid()
  ));

CREATE POLICY "Users can delete representatives of their companies" 
  ON public.company_representatives 
  FOR DELETE 
  USING (EXISTS (
    SELECT 1 FROM public.companies 
    WHERE companies.id = company_representatives.company_id 
    AND companies.owner_id = auth.uid()
  ));

-- Create policies for company cost codes table
CREATE POLICY "Users can view cost codes of their companies" 
  ON public.company_cost_codes 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.companies 
    WHERE companies.id = company_cost_codes.company_id 
    AND companies.owner_id = auth.uid()
  ));

CREATE POLICY "Users can create cost code associations for their companies" 
  ON public.company_cost_codes 
  FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.companies 
    WHERE companies.id = company_cost_codes.company_id 
    AND companies.owner_id = auth.uid()
  ));

CREATE POLICY "Users can delete cost code associations of their companies" 
  ON public.company_cost_codes 
  FOR DELETE 
  USING (EXISTS (
    SELECT 1 FROM public.companies 
    WHERE companies.id = company_cost_codes.company_id 
    AND companies.owner_id = auth.uid()
  ));
