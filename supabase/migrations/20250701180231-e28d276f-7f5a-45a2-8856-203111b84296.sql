
-- Create marketplace_companies table for paid feature
CREATE TABLE public.marketplace_companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  company_type TEXT NOT NULL CHECK (company_type IN ('Subcontractor', 'Vendor', 'Municipality', 'Consultant')),
  address TEXT,
  website TEXT,
  phone_number TEXT,
  description TEXT,
  specialties TEXT[],
  service_areas TEXT[],
  license_numbers TEXT[],
  insurance_verified BOOLEAN DEFAULT false,
  rating NUMERIC(2,1) CHECK (rating >= 0 AND rating <= 5),
  review_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create marketplace_company_representatives table
CREATE TABLE public.marketplace_company_representatives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  marketplace_company_id UUID NOT NULL REFERENCES public.marketplace_companies(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone_number TEXT,
  title TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on marketplace tables (for future paid feature control)
ALTER TABLE public.marketplace_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_company_representatives ENABLE ROW LEVEL SECURITY;

-- For now, allow all authenticated users to view marketplace companies (can be restricted later for paid feature)
CREATE POLICY "All authenticated users can view marketplace companies" 
  ON public.marketplace_companies 
  FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can view marketplace representatives" 
  ON public.marketplace_company_representatives 
  FOR SELECT 
  TO authenticated
  USING (true);

-- Insert some sample marketplace companies for demonstration
INSERT INTO public.marketplace_companies (company_name, company_type, address, website, phone_number, description, specialties, service_areas, rating, review_count) VALUES
('Premier Construction LLC', 'Subcontractor', '123 Main St, Austin, TX 78701', 'www.premierconstruction.com', '(555) 123-4567', 'Full-service construction company specializing in residential and commercial projects', ARRAY['Framing', 'Roofing', 'Foundation'], ARRAY['Austin', 'San Antonio', 'Houston'], 4.8, 127),
('Elite Electrical Services', 'Subcontractor', '456 Oak Ave, Dallas, TX 75201', 'www.eliteelectrical.com', '(555) 234-5678', 'Licensed electrical contractors with 20+ years experience', ARRAY['Electrical', 'Solar Installation', 'Smart Home'], ARRAY['Dallas', 'Fort Worth', 'Plano'], 4.9, 203),
('Superior Plumbing Co', 'Subcontractor', '789 Pine St, Houston, TX 77001', 'www.superiorplumbing.com', '(555) 345-6789', 'Commercial and residential plumbing specialists', ARRAY['Plumbing', 'HVAC', 'Water Heaters'], ARRAY['Houston', 'Katy', 'Sugar Land'], 4.7, 89);

-- Insert sample representatives
INSERT INTO public.marketplace_company_representatives (marketplace_company_id, first_name, last_name, email, phone_number, title, is_primary) 
SELECT 
  mc.id,
  'John',
  'Smith',
  'john.smith@premierconstruction.com',
  '(555) 123-4567',
  'Project Manager',
  true
FROM public.marketplace_companies mc WHERE mc.company_name = 'Premier Construction LLC';

INSERT INTO public.marketplace_company_representatives (marketplace_company_id, first_name, last_name, email, phone_number, title, is_primary) 
SELECT 
  mc.id,
  'Sarah',
  'Johnson',
  'sarah.johnson@eliteelectrical.com',
  '(555) 234-5678',
  'Lead Electrician',
  true
FROM public.marketplace_companies mc WHERE mc.company_name = 'Elite Electrical Services';

INSERT INTO public.marketplace_company_representatives (marketplace_company_id, first_name, last_name, email, phone_number, title, is_primary) 
SELECT 
  mc.id,
  'Mike',
  'Davis',
  'mike.davis@superiorplumbing.com',
  '(555) 345-6789',
  'Master Plumber',
  true
FROM public.marketplace_companies mc WHERE mc.company_name = 'Superior Plumbing Co';
