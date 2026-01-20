-- Create bill_payments table for consolidated check payments
CREATE TABLE public.bill_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  payment_date DATE NOT NULL,
  payment_account_id UUID NOT NULL REFERENCES public.accounts(id),
  vendor_id UUID NOT NULL REFERENCES public.companies(id),
  project_id UUID REFERENCES public.projects(id),
  total_amount NUMERIC(12,2) NOT NULL,
  memo TEXT,
  check_number VARCHAR(50),
  reconciled BOOLEAN DEFAULT FALSE,
  reconciliation_id UUID REFERENCES public.bank_reconciliations(id),
  reconciliation_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Junction table linking payments to bills
CREATE TABLE public.bill_payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_payment_id UUID NOT NULL REFERENCES public.bill_payments(id) ON DELETE CASCADE,
  bill_id UUID NOT NULL REFERENCES public.bills(id),
  amount_allocated NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on both tables
ALTER TABLE public.bill_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_payment_allocations ENABLE ROW LEVEL SECURITY;

-- RLS policies for bill_payments
CREATE POLICY "Users can access their company bill payments"
ON public.bill_payments
FOR ALL
USING (
  owner_id = auth.uid()
  OR
  owner_id IN (
    SELECT home_builder_id
    FROM public.users
    WHERE id = auth.uid() AND confirmed = true
  )
)
WITH CHECK (
  owner_id = auth.uid()
  OR
  owner_id IN (
    SELECT home_builder_id
    FROM public.users
    WHERE id = auth.uid() AND confirmed = true
  )
);

-- RLS policies for bill_payment_allocations (access through bill_payments)
CREATE POLICY "Users can access their company bill payment allocations"
ON public.bill_payment_allocations
FOR ALL
USING (
  bill_payment_id IN (
    SELECT id FROM public.bill_payments
    WHERE owner_id = auth.uid()
    OR owner_id IN (
      SELECT home_builder_id
      FROM public.users
      WHERE id = auth.uid() AND confirmed = true
    )
  )
)
WITH CHECK (
  bill_payment_id IN (
    SELECT id FROM public.bill_payments
    WHERE owner_id = auth.uid()
    OR owner_id IN (
      SELECT home_builder_id
      FROM public.users
      WHERE id = auth.uid() AND confirmed = true
    )
  )
);

-- Create indexes for performance
CREATE INDEX idx_bill_payments_owner_id ON public.bill_payments(owner_id);
CREATE INDEX idx_bill_payments_vendor_id ON public.bill_payments(vendor_id);
CREATE INDEX idx_bill_payments_payment_account_id ON public.bill_payments(payment_account_id);
CREATE INDEX idx_bill_payments_payment_date ON public.bill_payments(payment_date);
CREATE INDEX idx_bill_payments_reconciled ON public.bill_payments(reconciled);
CREATE INDEX idx_bill_payment_allocations_bill_payment_id ON public.bill_payment_allocations(bill_payment_id);
CREATE INDEX idx_bill_payment_allocations_bill_id ON public.bill_payment_allocations(bill_id);