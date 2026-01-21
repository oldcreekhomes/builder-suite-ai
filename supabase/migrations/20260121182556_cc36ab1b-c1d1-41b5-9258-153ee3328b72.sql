-- Create check print settings table for storing field positioning
CREATE TABLE public.check_print_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id),
  name TEXT DEFAULT 'Default',
  
  -- Page dimensions (inches)
  page_width NUMERIC DEFAULT 8.5,
  page_height NUMERIC DEFAULT 11,
  check_height NUMERIC DEFAULT 3.5,
  
  -- Company info (top left)
  company_name_x NUMERIC DEFAULT 0.25,
  company_name_y NUMERIC DEFAULT 0.35,
  
  -- Check number (top right)
  check_number_x NUMERIC DEFAULT 7.0,
  check_number_y NUMERIC DEFAULT 0.35,
  
  -- Date field
  date_x NUMERIC DEFAULT 7.0,
  date_y NUMERIC DEFAULT 1.1,
  
  -- Amount in words (with asterisks padding)
  amount_words_x NUMERIC DEFAULT 0.25,
  amount_words_y NUMERIC DEFAULT 1.4,
  
  -- Amount in numeric box
  amount_numeric_x NUMERIC DEFAULT 7.5,
  amount_numeric_y NUMERIC DEFAULT 1.4,
  
  -- Pay to the order of
  payee_x NUMERIC DEFAULT 0.65,
  payee_y NUMERIC DEFAULT 1.75,
  
  -- Stub section positions
  stub_company_x NUMERIC DEFAULT 0.25,
  stub_company_y NUMERIC DEFAULT 3.7,
  stub_payee_x NUMERIC DEFAULT 0.5,
  stub_payee_y NUMERIC DEFAULT 3.95,
  stub_date_check_x NUMERIC DEFAULT 5.5,
  stub_date_check_y NUMERIC DEFAULT 3.7,
  stub_invoice_date_x NUMERIC DEFAULT 5.5,
  stub_invoice_date_y NUMERIC DEFAULT 3.95,
  stub_amount_x NUMERIC DEFAULT 7.5,
  stub_amount_y NUMERIC DEFAULT 3.95,
  stub_bank_x NUMERIC DEFAULT 0.25,
  stub_bank_y NUMERIC DEFAULT 10.3,
  stub_total_x NUMERIC DEFAULT 7.5,
  stub_total_y NUMERIC DEFAULT 10.3,
  
  -- Font settings
  font_size NUMERIC DEFAULT 10,
  font_family TEXT DEFAULT 'Courier',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(owner_id, project_id)
);

-- Enable RLS
ALTER TABLE public.check_print_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own check print settings"
ON public.check_print_settings FOR SELECT
USING (auth.uid() = owner_id);

CREATE POLICY "Users can create their own check print settings"
ON public.check_print_settings FOR INSERT
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own check print settings"
ON public.check_print_settings FOR UPDATE
USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own check print settings"
ON public.check_print_settings FOR DELETE
USING (auth.uid() = owner_id);

-- Add updated_at trigger
CREATE TRIGGER update_check_print_settings_updated_at
BEFORE UPDATE ON public.check_print_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();