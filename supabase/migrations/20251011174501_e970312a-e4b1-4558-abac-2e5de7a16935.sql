-- Create vendor_aliases table for remembering vendor name variations
CREATE TABLE IF NOT EXISTS public.vendor_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  normalized_alias TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(owner_id, normalized_alias)
);

-- Enable RLS
ALTER TABLE public.vendor_aliases ENABLE ROW LEVEL SECURITY;

-- RLS policies: scoped to home builder (same pattern as companies table)
CREATE POLICY "Vendor aliases scoped to home builder"
ON public.vendor_aliases
FOR ALL
USING (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT u.home_builder_id 
    FROM users u 
    WHERE u.id = auth.uid() 
      AND u.confirmed = true 
      AND u.role IN ('employee', 'accountant')
  ))
)
WITH CHECK (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT u.home_builder_id 
    FROM users u 
    WHERE u.id = auth.uid() 
      AND u.confirmed = true 
      AND u.role IN ('employee', 'accountant')
  ))
);

-- Create index for faster lookups
CREATE INDEX idx_vendor_aliases_owner_normalized ON public.vendor_aliases(owner_id, normalized_alias);