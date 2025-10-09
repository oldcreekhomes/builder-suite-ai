-- Create deposits table
CREATE TABLE public.deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  created_by UUID NOT NULL,
  deposit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  bank_account_id UUID NOT NULL,
  project_id UUID,
  amount NUMERIC NOT NULL DEFAULT 0,
  memo TEXT,
  company_name TEXT,
  company_address TEXT,
  company_city_state TEXT,
  bank_name TEXT,
  routing_number TEXT,
  account_number TEXT,
  status TEXT NOT NULL DEFAULT 'posted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create deposit lines table
CREATE TABLE public.deposit_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deposit_id UUID NOT NULL REFERENCES public.deposits(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  line_number INTEGER NOT NULL DEFAULT 1,
  line_type TEXT NOT NULL, -- 'revenue' or 'customer_payment'
  account_id UUID,
  project_id UUID,
  amount NUMERIC NOT NULL DEFAULT 0,
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on deposits
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;

-- Enable RLS on deposit_lines
ALTER TABLE public.deposit_lines ENABLE ROW LEVEL SECURITY;

-- RLS policies for deposits (similar to checks)
CREATE POLICY "Deposits visible to owner and confirmed employees"
ON public.deposits FOR SELECT
USING (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT u.home_builder_id FROM users u 
    WHERE u.id = auth.uid() AND u.confirmed = true AND u.role = 'employee'
  ))
);

CREATE POLICY "Deposits insert limited to owner and confirmed employees"
ON public.deposits FOR INSERT
WITH CHECK (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT u.home_builder_id FROM users u 
    WHERE u.id = auth.uid() AND u.confirmed = true AND u.role = 'employee'
  ))
);

CREATE POLICY "Deposits update limited to owner and confirmed employees"
ON public.deposits FOR UPDATE
USING (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT u.home_builder_id FROM users u 
    WHERE u.id = auth.uid() AND u.confirmed = true AND u.role = 'employee'
  ))
);

CREATE POLICY "Deposits delete limited to owner and confirmed employees"
ON public.deposits FOR DELETE
USING (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT u.home_builder_id FROM users u 
    WHERE u.id = auth.uid() AND u.confirmed = true AND u.role = 'employee'
  ))
);

-- RLS policies for deposit_lines (similar to check_lines)
CREATE POLICY "Deposit lines visible to owner and confirmed employees"
ON public.deposit_lines FOR SELECT
USING (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT u.home_builder_id FROM users u 
    WHERE u.id = auth.uid() AND u.confirmed = true AND u.role = 'employee'
  ))
);

CREATE POLICY "Deposit lines insert limited to owner and confirmed employees"
ON public.deposit_lines FOR INSERT
WITH CHECK (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT u.home_builder_id FROM users u 
    WHERE u.id = auth.uid() AND u.confirmed = true AND u.role = 'employee'
  ))
);

CREATE POLICY "Deposit lines update limited to owner and confirmed employees"
ON public.deposit_lines FOR UPDATE
USING (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT u.home_builder_id FROM users u 
    WHERE u.id = auth.uid() AND u.confirmed = true AND u.role = 'employee'
  ))
);

CREATE POLICY "Deposit lines delete limited to owner and confirmed employees"
ON public.deposit_lines FOR DELETE
USING (
  (owner_id = auth.uid()) OR 
  (owner_id IN (
    SELECT u.home_builder_id FROM users u 
    WHERE u.id = auth.uid() AND u.confirmed = true AND u.role = 'employee'
  ))
);

-- Create trigger function for updated_at on deposits
CREATE OR REPLACE FUNCTION public.update_deposits_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create trigger for deposits updated_at
CREATE TRIGGER update_deposits_updated_at
BEFORE UPDATE ON public.deposits
FOR EACH ROW
EXECUTE FUNCTION public.update_deposits_updated_at();

-- Create trigger function for updated_at on deposit_lines
CREATE OR REPLACE FUNCTION public.update_deposit_lines_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create trigger for deposit_lines updated_at
CREATE TRIGGER update_deposit_lines_updated_at
BEFORE UPDATE ON public.deposit_lines
FOR EACH ROW
EXECUTE FUNCTION public.update_deposit_lines_updated_at();

-- Create trigger function to sync owner_id from deposit to deposit_lines
CREATE OR REPLACE FUNCTION public.sync_deposit_line_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  d_owner UUID;
BEGIN
  SELECT owner_id INTO d_owner FROM public.deposits WHERE id = NEW.deposit_id;
  IF d_owner IS NULL THEN
    RAISE EXCEPTION 'Invalid deposit_id';
  END IF;
  NEW.owner_id := d_owner;
  RETURN NEW;
END;
$$;

-- Create trigger to sync owner_id on deposit_lines insert
CREATE TRIGGER sync_deposit_line_owner_trigger
BEFORE INSERT ON public.deposit_lines
FOR EACH ROW
EXECUTE FUNCTION public.sync_deposit_line_owner();

-- Create indexes for performance
CREATE INDEX idx_deposits_owner_id ON public.deposits(owner_id);
CREATE INDEX idx_deposits_project_id ON public.deposits(project_id);
CREATE INDEX idx_deposits_deposit_date ON public.deposits(deposit_date);
CREATE INDEX idx_deposit_lines_deposit_id ON public.deposit_lines(deposit_id);
CREATE INDEX idx_deposit_lines_owner_id ON public.deposit_lines(owner_id);