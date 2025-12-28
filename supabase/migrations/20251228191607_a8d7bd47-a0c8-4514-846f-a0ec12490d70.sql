-- Create company_insurances table for tracking insurance compliance
CREATE TABLE public.company_insurances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  insurance_type TEXT NOT NULL CHECK (insurance_type IN (
    'commercial_general_liability',
    'automobile_liability', 
    'umbrella_liability',
    'workers_compensation'
  )),
  expiration_date DATE NOT NULL,
  policy_number TEXT,
  carrier_name TEXT,
  coverage_amount NUMERIC,
  certificate_file_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  home_builder_id UUID NOT NULL,
  UNIQUE(company_id, insurance_type)
);

-- Enable RLS
ALTER TABLE public.company_insurances ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (scoped to home builder like companies table)
CREATE POLICY "Company insurances scoped to home builder"
ON public.company_insurances
FOR ALL
USING (
  (home_builder_id = auth.uid()) OR 
  (home_builder_id IN (
    SELECT u.home_builder_id FROM users u 
    WHERE u.id = auth.uid() AND u.confirmed = true AND u.role = ANY(ARRAY['employee'::text, 'accountant'::text])
  ))
)
WITH CHECK (
  (home_builder_id = auth.uid()) OR 
  (home_builder_id IN (
    SELECT u.home_builder_id FROM users u 
    WHERE u.id = auth.uid() AND u.confirmed = true AND u.role = ANY(ARRAY['employee'::text, 'accountant'::text])
  ))
);

-- Create trigger for updated_at
CREATE TRIGGER update_company_insurances_updated_at
BEFORE UPDATE ON public.company_insurances
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();