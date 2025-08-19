-- Add foreign key constraints with CASCADE DELETE for company relationships

-- Add foreign key constraint to company_representatives table
ALTER TABLE public.company_representatives 
ADD CONSTRAINT fk_company_representatives_company_id 
FOREIGN KEY (company_id) 
REFERENCES public.companies(id) 
ON DELETE CASCADE;

-- Add foreign key constraint to company_cost_codes table  
ALTER TABLE public.company_cost_codes 
ADD CONSTRAINT fk_company_cost_codes_company_id 
FOREIGN KEY (company_id) 
REFERENCES public.companies(id) 
ON DELETE CASCADE;