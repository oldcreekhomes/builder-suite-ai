-- Create dashboard_card_settings table
CREATE TABLE public.dashboard_card_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_name TEXT NOT NULL,
  dashboard_type TEXT NOT NULL,
  card_type TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_name, dashboard_type, card_type)
);

-- Enable RLS
ALTER TABLE public.dashboard_card_settings ENABLE ROW LEVEL SECURITY;

-- Company users can view dashboard settings
CREATE POLICY "Company users can view dashboard settings"
ON public.dashboard_card_settings
FOR SELECT
USING (company_name IN (
  SELECT users.company_name FROM users WHERE users.id = auth.uid()
));

-- Only owners can insert dashboard settings
CREATE POLICY "Only owners can insert dashboard settings"
ON public.dashboard_card_settings
FOR INSERT
WITH CHECK (company_name IN (
  SELECT u.company_name FROM users u
  WHERE u.id = auth.uid() AND has_role(auth.uid(), 'owner'::app_role)
));

-- Only owners can update dashboard settings
CREATE POLICY "Only owners can update dashboard settings"
ON public.dashboard_card_settings
FOR UPDATE
USING (company_name IN (
  SELECT u.company_name FROM users u
  WHERE u.id = auth.uid() AND has_role(auth.uid(), 'owner'::app_role)
));

-- Only owners can delete dashboard settings
CREATE POLICY "Only owners can delete dashboard settings"
ON public.dashboard_card_settings
FOR DELETE
USING (company_name IN (
  SELECT u.company_name FROM users u
  WHERE u.id = auth.uid() AND has_role(auth.uid(), 'owner'::app_role)
));