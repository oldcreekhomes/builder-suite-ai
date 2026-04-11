
-- Create recurring_transactions table
CREATE TABLE public.recurring_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('check', 'credit_card', 'bill')),
  frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('weekly', 'monthly', 'quarterly', 'annually')),
  next_date DATE NOT NULL,
  end_date DATE,
  auto_enter BOOLEAN NOT NULL DEFAULT false,
  template_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create recurring_transaction_lines table
CREATE TABLE public.recurring_transaction_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recurring_transaction_id UUID NOT NULL REFERENCES public.recurring_transactions(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  line_type TEXT NOT NULL DEFAULT 'expense' CHECK (line_type IN ('job_cost', 'expense')),
  account_id UUID REFERENCES public.accounts(id),
  cost_code_id UUID REFERENCES public.cost_codes(id),
  project_id UUID REFERENCES public.projects(id),
  lot_id UUID REFERENCES public.project_lots(id),
  quantity NUMERIC NOT NULL DEFAULT 1,
  amount NUMERIC NOT NULL DEFAULT 0,
  memo TEXT,
  line_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_transaction_lines ENABLE ROW LEVEL SECURITY;

-- RLS policies for recurring_transactions (owner or employee of owner)
CREATE POLICY "Users can view own recurring transactions"
  ON public.recurring_transactions FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR owner_id = (SELECT home_builder_id FROM public.users WHERE id = auth.uid() AND role = 'employee' AND confirmed = true)
  );

CREATE POLICY "Users can create own recurring transactions"
  ON public.recurring_transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    OR owner_id = (SELECT home_builder_id FROM public.users WHERE id = auth.uid() AND role = 'employee' AND confirmed = true)
  );

CREATE POLICY "Users can update own recurring transactions"
  ON public.recurring_transactions FOR UPDATE
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR owner_id = (SELECT home_builder_id FROM public.users WHERE id = auth.uid() AND role = 'employee' AND confirmed = true)
  );

CREATE POLICY "Users can delete own recurring transactions"
  ON public.recurring_transactions FOR DELETE
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR owner_id = (SELECT home_builder_id FROM public.users WHERE id = auth.uid() AND role = 'employee' AND confirmed = true)
  );

-- RLS policies for recurring_transaction_lines
CREATE POLICY "Users can view own recurring transaction lines"
  ON public.recurring_transaction_lines FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR owner_id = (SELECT home_builder_id FROM public.users WHERE id = auth.uid() AND role = 'employee' AND confirmed = true)
  );

CREATE POLICY "Users can create own recurring transaction lines"
  ON public.recurring_transaction_lines FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    OR owner_id = (SELECT home_builder_id FROM public.users WHERE id = auth.uid() AND role = 'employee' AND confirmed = true)
  );

CREATE POLICY "Users can update own recurring transaction lines"
  ON public.recurring_transaction_lines FOR UPDATE
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR owner_id = (SELECT home_builder_id FROM public.users WHERE id = auth.uid() AND role = 'employee' AND confirmed = true)
  );

CREATE POLICY "Users can delete own recurring transaction lines"
  ON public.recurring_transaction_lines FOR DELETE
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR owner_id = (SELECT home_builder_id FROM public.users WHERE id = auth.uid() AND role = 'employee' AND confirmed = true)
  );

-- Sync owner_id on recurring_transaction_lines from parent
CREATE OR REPLACE FUNCTION public.sync_recurring_line_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  rt_owner UUID;
BEGIN
  SELECT owner_id INTO rt_owner FROM public.recurring_transactions WHERE id = NEW.recurring_transaction_id;
  IF rt_owner IS NULL THEN
    RAISE EXCEPTION 'Invalid recurring_transaction_id';
  END IF;
  NEW.owner_id := rt_owner;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_recurring_line_owner_trigger
  BEFORE INSERT ON public.recurring_transaction_lines
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_recurring_line_owner();

-- Updated_at triggers
CREATE TRIGGER update_recurring_transactions_updated_at
  BEFORE UPDATE ON public.recurring_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recurring_transaction_lines_updated_at
  BEFORE UPDATE ON public.recurring_transaction_lines
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_recurring_transactions_owner ON public.recurring_transactions(owner_id);
CREATE INDEX idx_recurring_transactions_next_date ON public.recurring_transactions(next_date) WHERE is_active = true;
CREATE INDEX idx_recurring_transaction_lines_parent ON public.recurring_transaction_lines(recurring_transaction_id);
