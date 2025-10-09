-- Create deposit_sources table for customers who make deposits
CREATE TABLE IF NOT EXISTS public.deposit_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  customer_name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  phone_number TEXT,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.deposit_sources ENABLE ROW LEVEL SECURITY;

-- RLS Policies for deposit_sources
CREATE POLICY "Deposit sources visible to owner and confirmed employees"
ON public.deposit_sources FOR SELECT
USING (
  owner_id = auth.uid() OR
  owner_id IN (
    SELECT home_builder_id FROM public.users 
    WHERE id = auth.uid() AND confirmed = true AND role = 'employee'
  )
);

CREATE POLICY "Deposit sources insert limited to owner and confirmed employees"
ON public.deposit_sources FOR INSERT
WITH CHECK (
  owner_id = auth.uid() OR
  owner_id IN (
    SELECT home_builder_id FROM public.users 
    WHERE id = auth.uid() AND confirmed = true AND role = 'employee'
  )
);

CREATE POLICY "Deposit sources update limited to owner and confirmed employees"
ON public.deposit_sources FOR UPDATE
USING (
  owner_id = auth.uid() OR
  owner_id IN (
    SELECT home_builder_id FROM public.users 
    WHERE id = auth.uid() AND confirmed = true AND role = 'employee'
  )
);

CREATE POLICY "Deposit sources delete limited to owner and confirmed employees"
ON public.deposit_sources FOR DELETE
USING (
  owner_id = auth.uid() OR
  owner_id IN (
    SELECT home_builder_id FROM public.users 
    WHERE id = auth.uid() AND confirmed = true AND role = 'employee'
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_deposit_sources_updated_at
  BEFORE UPDATE ON public.deposit_sources
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_deposit_sources_owner_id ON public.deposit_sources(owner_id);
CREATE INDEX idx_deposit_sources_customer_name ON public.deposit_sources(customer_name);

-- Add deposit_source_id column to deposits table
ALTER TABLE public.deposits 
ADD COLUMN IF NOT EXISTS deposit_source_id UUID REFERENCES public.deposit_sources(id) ON DELETE SET NULL;