-- Add reconciliation fields to checks table
ALTER TABLE public.checks
ADD COLUMN reconciled boolean DEFAULT false NOT NULL,
ADD COLUMN reconciliation_date date,
ADD COLUMN reconciliation_id uuid;

-- Add reconciliation fields to deposits table
ALTER TABLE public.deposits
ADD COLUMN reconciled boolean DEFAULT false NOT NULL,
ADD COLUMN reconciliation_date date,
ADD COLUMN reconciliation_id uuid;

-- Create bank_reconciliations table
CREATE TABLE public.bank_reconciliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  project_id uuid,
  bank_account_id uuid NOT NULL,
  statement_date date NOT NULL,
  statement_beginning_balance numeric NOT NULL,
  statement_ending_balance numeric NOT NULL,
  reconciled_balance numeric DEFAULT 0 NOT NULL,
  difference numeric DEFAULT 0 NOT NULL,
  status text DEFAULT 'in_progress' NOT NULL,
  completed_at timestamp with time zone,
  completed_by uuid,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS on bank_reconciliations
ALTER TABLE public.bank_reconciliations ENABLE ROW LEVEL SECURITY;

-- RLS policy for bank_reconciliations - owner and confirmed employees can access
CREATE POLICY "Bank reconciliations visible to owner and confirmed employees"
ON public.bank_reconciliations
FOR SELECT
USING (
  owner_id = auth.uid() OR 
  owner_id IN (
    SELECT u.home_builder_id 
    FROM users u 
    WHERE u.id = auth.uid() 
    AND u.confirmed = true 
    AND u.role IN ('employee', 'accountant')
  )
);

CREATE POLICY "Bank reconciliations insert limited to owner and confirmed employees"
ON public.bank_reconciliations
FOR INSERT
WITH CHECK (
  owner_id = auth.uid() OR 
  owner_id IN (
    SELECT u.home_builder_id 
    FROM users u 
    WHERE u.id = auth.uid() 
    AND u.confirmed = true 
    AND u.role IN ('employee', 'accountant')
  )
);

CREATE POLICY "Bank reconciliations update limited to owner and confirmed employees"
ON public.bank_reconciliations
FOR UPDATE
USING (
  owner_id = auth.uid() OR 
  owner_id IN (
    SELECT u.home_builder_id 
    FROM users u 
    WHERE u.id = auth.uid() 
    AND u.confirmed = true 
    AND u.role IN ('employee', 'accountant')
  )
);

CREATE POLICY "Bank reconciliations delete limited to owner and confirmed employees"
ON public.bank_reconciliations
FOR DELETE
USING (
  owner_id = auth.uid() OR 
  owner_id IN (
    SELECT u.home_builder_id 
    FROM users u 
    WHERE u.id = auth.uid() 
    AND u.confirmed = true 
    AND u.role IN ('employee', 'accountant')
  )
);

-- Create updated_at trigger for bank_reconciliations
CREATE TRIGGER update_bank_reconciliations_updated_at
BEFORE UPDATE ON public.bank_reconciliations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();