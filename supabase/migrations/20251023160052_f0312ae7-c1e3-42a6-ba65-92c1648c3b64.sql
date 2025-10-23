-- Create the price history table
CREATE TABLE IF NOT EXISTS public.cost_code_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cost_code_id UUID NOT NULL REFERENCES public.cost_codes(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add indexes for faster queries
CREATE INDEX idx_cost_code_price_history_cost_code_id ON public.cost_code_price_history(cost_code_id);
CREATE INDEX idx_cost_code_price_history_changed_at ON public.cost_code_price_history(changed_at DESC);

-- Enable RLS
ALTER TABLE public.cost_code_price_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their company's price history
CREATE POLICY "Price history visible to company users"
  ON public.cost_code_price_history
  FOR SELECT
  USING (
    (owner_id = auth.uid()) 
    OR 
    (owner_id IN (
      SELECT home_builder_id 
      FROM public.users 
      WHERE id = auth.uid() 
        AND confirmed = true 
        AND role IN ('employee', 'accountant')
    ))
  );

-- Policy: Users can insert price history for their company
CREATE POLICY "Price history insert limited to company users"
  ON public.cost_code_price_history
  FOR INSERT
  WITH CHECK (
    (owner_id = auth.uid()) 
    OR 
    (owner_id IN (
      SELECT home_builder_id 
      FROM public.users 
      WHERE id = auth.uid() 
        AND confirmed = true 
        AND role IN ('employee', 'accountant')
    ))
  );

-- Policy: No updates allowed (immutable history)
CREATE POLICY "Price history is immutable"
  ON public.cost_code_price_history
  FOR UPDATE
  USING (false);

-- Policy: No deletes allowed (preserve history)
CREATE POLICY "Price history cannot be deleted"
  ON public.cost_code_price_history
  FOR DELETE
  USING (false);

-- Insert all current prices as initial historical records
INSERT INTO public.cost_code_price_history (
  cost_code_id, 
  price, 
  changed_at, 
  changed_by, 
  owner_id, 
  notes
)
SELECT
  id,
  price,
  created_at,
  owner_id,
  owner_id,
  'Initial price at cost code creation'
FROM public.cost_codes
WHERE price IS NOT NULL;