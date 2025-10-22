-- Create credit_cards table
CREATE TABLE public.credit_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  created_by UUID NOT NULL,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'refund')),
  credit_card_account_id UUID NOT NULL,
  vendor TEXT NOT NULL,
  project_id UUID,
  amount NUMERIC NOT NULL DEFAULT 0,
  memo TEXT,
  status TEXT NOT NULL DEFAULT 'posted',
  reconciled BOOLEAN NOT NULL DEFAULT false,
  reconciliation_id UUID,
  reconciliation_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create credit_card_lines table
CREATE TABLE public.credit_card_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  credit_card_id UUID NOT NULL,
  owner_id UUID NOT NULL,
  line_number INTEGER NOT NULL DEFAULT 1,
  line_type TEXT NOT NULL CHECK (line_type IN ('expense', 'job_cost')),
  account_id UUID,
  cost_code_id UUID,
  project_id UUID,
  amount NUMERIC NOT NULL DEFAULT 0,
  memo TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  FOREIGN KEY (credit_card_id) REFERENCES public.credit_cards(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_card_lines ENABLE ROW LEVEL SECURITY;

-- RLS policies for credit_cards
CREATE POLICY "Credit cards visible to owner and confirmed employees"
ON public.credit_cards FOR SELECT
USING (
  owner_id = auth.uid() OR 
  owner_id IN (
    SELECT u.home_builder_id 
    FROM users u 
    WHERE u.id = auth.uid() 
    AND u.confirmed = true 
    AND u.role = ANY(ARRAY['employee', 'accountant'])
  )
);

CREATE POLICY "Credit cards insert limited to owner and confirmed employees"
ON public.credit_cards FOR INSERT
WITH CHECK (
  owner_id = auth.uid() OR 
  owner_id IN (
    SELECT u.home_builder_id 
    FROM users u 
    WHERE u.id = auth.uid() 
    AND u.confirmed = true 
    AND u.role = ANY(ARRAY['employee', 'accountant'])
  )
);

CREATE POLICY "Credit cards update limited to owner and confirmed employees"
ON public.credit_cards FOR UPDATE
USING (
  owner_id = auth.uid() OR 
  owner_id IN (
    SELECT u.home_builder_id 
    FROM users u 
    WHERE u.id = auth.uid() 
    AND u.confirmed = true 
    AND u.role = ANY(ARRAY['employee', 'accountant'])
  )
);

CREATE POLICY "Credit cards delete limited to owner and confirmed employees"
ON public.credit_cards FOR DELETE
USING (
  owner_id = auth.uid() OR 
  owner_id IN (
    SELECT u.home_builder_id 
    FROM users u 
    WHERE u.id = auth.uid() 
    AND u.confirmed = true 
    AND u.role = ANY(ARRAY['employee', 'accountant'])
  )
);

-- RLS policies for credit_card_lines
CREATE POLICY "Credit card lines visible to owner and confirmed employees"
ON public.credit_card_lines FOR SELECT
USING (
  owner_id = auth.uid() OR 
  owner_id IN (
    SELECT u.home_builder_id 
    FROM users u 
    WHERE u.id = auth.uid() 
    AND u.confirmed = true 
    AND u.role = ANY(ARRAY['employee', 'accountant'])
  )
);

CREATE POLICY "Credit card lines insert limited to owner and confirmed employees"
ON public.credit_card_lines FOR INSERT
WITH CHECK (
  owner_id = auth.uid() OR 
  owner_id IN (
    SELECT u.home_builder_id 
    FROM users u 
    WHERE u.id = auth.uid() 
    AND u.confirmed = true 
    AND u.role = ANY(ARRAY['employee', 'accountant'])
  )
);

CREATE POLICY "Credit card lines update limited to owner and confirmed employees"
ON public.credit_card_lines FOR UPDATE
USING (
  owner_id = auth.uid() OR 
  owner_id IN (
    SELECT u.home_builder_id 
    FROM users u 
    WHERE u.id = auth.uid() 
    AND u.confirmed = true 
    AND u.role = ANY(ARRAY['employee', 'accountant'])
  )
);

CREATE POLICY "Credit card lines delete limited to owner and confirmed employees"
ON public.credit_card_lines FOR DELETE
USING (
  owner_id = auth.uid() OR 
  owner_id IN (
    SELECT u.home_builder_id 
    FROM users u 
    WHERE u.id = auth.uid() 
    AND u.confirmed = true 
    AND u.role = ANY(ARRAY['employee', 'accountant'])
  )
);

-- Trigger to sync owner_id from credit_card to credit_card_lines
CREATE OR REPLACE FUNCTION public.sync_credit_card_line_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cc_owner UUID;
BEGIN
  SELECT owner_id INTO cc_owner FROM public.credit_cards WHERE id = NEW.credit_card_id;
  IF cc_owner IS NULL THEN
    RAISE EXCEPTION 'Invalid credit_card_id';
  END IF;
  NEW.owner_id := cc_owner;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_credit_card_line_owner_trigger
BEFORE INSERT ON public.credit_card_lines
FOR EACH ROW
EXECUTE FUNCTION public.sync_credit_card_line_owner();

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_credit_cards_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_credit_cards_updated_at_trigger
BEFORE UPDATE ON public.credit_cards
FOR EACH ROW
EXECUTE FUNCTION public.update_credit_cards_updated_at();

CREATE OR REPLACE FUNCTION public.update_credit_card_lines_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_credit_card_lines_updated_at_trigger
BEFORE UPDATE ON public.credit_card_lines
FOR EACH ROW
EXECUTE FUNCTION public.update_credit_card_lines_updated_at();

-- Create indexes
CREATE INDEX idx_credit_cards_owner_id ON public.credit_cards(owner_id);
CREATE INDEX idx_credit_cards_transaction_date ON public.credit_cards(transaction_date);
CREATE INDEX idx_credit_cards_created_at ON public.credit_cards(created_at);
CREATE INDEX idx_credit_card_lines_credit_card_id ON public.credit_card_lines(credit_card_id);
CREATE INDEX idx_credit_card_lines_owner_id ON public.credit_card_lines(owner_id);

-- Function to delete credit card transaction with journal entries
CREATE OR REPLACE FUNCTION public.delete_credit_card_with_journal_entries(credit_card_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete journal entry lines for credit card entries
  DELETE FROM public.journal_entry_lines 
  WHERE journal_entry_id IN (
    SELECT id FROM public.journal_entries 
    WHERE source_type = 'credit_card' AND source_id = credit_card_id_param
  );
  
  -- Delete journal entries for credit cards
  DELETE FROM public.journal_entries 
  WHERE source_type = 'credit_card' AND source_id = credit_card_id_param;
  
  -- Delete credit card lines
  DELETE FROM public.credit_card_lines 
  WHERE credit_card_id = credit_card_id_param;
  
  -- Finally delete the credit card
  DELETE FROM public.credit_cards 
  WHERE id = credit_card_id_param;
  
  RETURN FOUND;
END;
$$;