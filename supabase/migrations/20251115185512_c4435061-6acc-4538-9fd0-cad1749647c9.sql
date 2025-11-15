-- Create attachment tables for accounting forms

-- Journal Entry Attachments
CREATE TABLE public.journal_entry_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  content_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Check Attachments
CREATE TABLE public.check_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_id UUID NOT NULL REFERENCES public.checks(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  content_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deposit Attachments
CREATE TABLE public.deposit_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deposit_id UUID NOT NULL REFERENCES public.deposits(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  content_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Credit Card Attachments
CREATE TABLE public.credit_card_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_card_id UUID NOT NULL REFERENCES public.credit_cards(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  content_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_journal_entry_attachments_journal_entry_id ON public.journal_entry_attachments(journal_entry_id);
CREATE INDEX idx_check_attachments_check_id ON public.check_attachments(check_id);
CREATE INDEX idx_deposit_attachments_deposit_id ON public.deposit_attachments(deposit_id);
CREATE INDEX idx_credit_card_attachments_credit_card_id ON public.credit_card_attachments(credit_card_id);

-- Create updated_at triggers
CREATE TRIGGER update_journal_entry_attachments_updated_at
  BEFORE UPDATE ON public.journal_entry_attachments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_check_attachments_updated_at
  BEFORE UPDATE ON public.check_attachments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deposit_attachments_updated_at
  BEFORE UPDATE ON public.deposit_attachments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credit_card_attachments_updated_at
  BEFORE UPDATE ON public.credit_card_attachments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies for Journal Entry Attachments
ALTER TABLE public.journal_entry_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view journal entry attachments for their company"
  ON public.journal_entry_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.journal_entries je
      WHERE je.id = journal_entry_attachments.journal_entry_id
      AND (je.owner_id = auth.uid() OR je.owner_id IN (
        SELECT u.home_builder_id FROM users u
        WHERE u.id = auth.uid() AND u.confirmed = true AND u.role IN ('employee', 'accountant')
      ))
    )
  );

CREATE POLICY "Users can insert journal entry attachments for their company"
  ON public.journal_entry_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.journal_entries je
      WHERE je.id = journal_entry_attachments.journal_entry_id
      AND (je.owner_id = auth.uid() OR je.owner_id IN (
        SELECT u.home_builder_id FROM users u
        WHERE u.id = auth.uid() AND u.confirmed = true AND u.role IN ('employee', 'accountant')
      ))
    )
  );

CREATE POLICY "Users can delete journal entry attachments for their company"
  ON public.journal_entry_attachments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.journal_entries je
      WHERE je.id = journal_entry_attachments.journal_entry_id
      AND (je.owner_id = auth.uid() OR je.owner_id IN (
        SELECT u.home_builder_id FROM users u
        WHERE u.id = auth.uid() AND u.confirmed = true AND u.role IN ('employee', 'accountant')
      ))
    )
  );

-- RLS Policies for Check Attachments
ALTER TABLE public.check_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view check attachments for their company"
  ON public.check_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.checks c
      WHERE c.id = check_attachments.check_id
      AND (c.owner_id = auth.uid() OR c.owner_id IN (
        SELECT u.home_builder_id FROM users u
        WHERE u.id = auth.uid() AND u.confirmed = true AND u.role IN ('employee', 'accountant')
      ))
    )
  );

CREATE POLICY "Users can insert check attachments for their company"
  ON public.check_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.checks c
      WHERE c.id = check_attachments.check_id
      AND (c.owner_id = auth.uid() OR c.owner_id IN (
        SELECT u.home_builder_id FROM users u
        WHERE u.id = auth.uid() AND u.confirmed = true AND u.role IN ('employee', 'accountant')
      ))
    )
  );

CREATE POLICY "Users can delete check attachments for their company"
  ON public.check_attachments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.checks c
      WHERE c.id = check_attachments.check_id
      AND (c.owner_id = auth.uid() OR c.owner_id IN (
        SELECT u.home_builder_id FROM users u
        WHERE u.id = auth.uid() AND u.confirmed = true AND u.role IN ('employee', 'accountant')
      ))
    )
  );

-- RLS Policies for Deposit Attachments
ALTER TABLE public.deposit_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view deposit attachments for their company"
  ON public.deposit_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.deposits d
      WHERE d.id = deposit_attachments.deposit_id
      AND (d.owner_id = auth.uid() OR d.owner_id IN (
        SELECT u.home_builder_id FROM users u
        WHERE u.id = auth.uid() AND u.confirmed = true AND u.role IN ('employee', 'accountant')
      ))
    )
  );

CREATE POLICY "Users can insert deposit attachments for their company"
  ON public.deposit_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.deposits d
      WHERE d.id = deposit_attachments.deposit_id
      AND (d.owner_id = auth.uid() OR d.owner_id IN (
        SELECT u.home_builder_id FROM users u
        WHERE u.id = auth.uid() AND u.confirmed = true AND u.role IN ('employee', 'accountant')
      ))
    )
  );

CREATE POLICY "Users can delete deposit attachments for their company"
  ON public.deposit_attachments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.deposits d
      WHERE d.id = deposit_attachments.deposit_id
      AND (d.owner_id = auth.uid() OR d.owner_id IN (
        SELECT u.home_builder_id FROM users u
        WHERE u.id = auth.uid() AND u.confirmed = true AND u.role IN ('employee', 'accountant')
      ))
    )
  );

-- RLS Policies for Credit Card Attachments
ALTER TABLE public.credit_card_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view credit card attachments for their company"
  ON public.credit_card_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.credit_cards cc
      WHERE cc.id = credit_card_attachments.credit_card_id
      AND (cc.owner_id = auth.uid() OR cc.owner_id IN (
        SELECT u.home_builder_id FROM users u
        WHERE u.id = auth.uid() AND u.confirmed = true AND u.role IN ('employee', 'accountant')
      ))
    )
  );

CREATE POLICY "Users can insert credit card attachments for their company"
  ON public.credit_card_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.credit_cards cc
      WHERE cc.id = credit_card_attachments.credit_card_id
      AND (cc.owner_id = auth.uid() OR cc.owner_id IN (
        SELECT u.home_builder_id FROM users u
        WHERE u.id = auth.uid() AND u.confirmed = true AND u.role IN ('employee', 'accountant')
      ))
    )
  );

CREATE POLICY "Users can delete credit card attachments for their company"
  ON public.credit_card_attachments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.credit_cards cc
      WHERE cc.id = credit_card_attachments.credit_card_id
      AND (cc.owner_id = auth.uid() OR cc.owner_id IN (
        SELECT u.home_builder_id FROM users u
        WHERE u.id = auth.uid() AND u.confirmed = true AND u.role IN ('employee', 'accountant')
      ))
    )
  );