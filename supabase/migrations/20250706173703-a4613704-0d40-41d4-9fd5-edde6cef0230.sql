-- Create cost_code_specifications table
CREATE TABLE public.cost_code_specifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cost_code_id UUID NOT NULL REFERENCES public.cost_codes(id) ON DELETE CASCADE,
  description TEXT,
  files JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS on cost_code_specifications table
ALTER TABLE public.cost_code_specifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for cost_code_specifications
CREATE POLICY "Users can view specifications for their cost codes" ON public.cost_code_specifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.cost_codes 
      WHERE cost_codes.id = cost_code_specifications.cost_code_id 
      AND cost_codes.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create specifications for their cost codes" ON public.cost_code_specifications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cost_codes 
      WHERE cost_codes.id = cost_code_specifications.cost_code_id 
      AND cost_codes.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update specifications for their cost codes" ON public.cost_code_specifications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.cost_codes 
      WHERE cost_codes.id = cost_code_specifications.cost_code_id 
      AND cost_codes.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete specifications for their cost codes" ON public.cost_code_specifications
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.cost_codes 
      WHERE cost_codes.id = cost_code_specifications.cost_code_id 
      AND cost_codes.owner_id = auth.uid()
    )
  );

-- Create unique constraint to prevent duplicate specifications per cost code
CREATE UNIQUE INDEX cost_code_specifications_cost_code_id_unique ON public.cost_code_specifications(cost_code_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_cost_code_specifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_cost_code_specifications_updated_at
  BEFORE UPDATE ON public.cost_code_specifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cost_code_specifications_updated_at();