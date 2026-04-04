
-- Create the apartment_pro_formas table
CREATE TABLE public.apartment_pro_formas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.apartment_pro_formas ENABLE ROW LEVEL SECURITY;

-- Owner can do everything with their own rows
CREATE POLICY "Owners can manage their own pro formas"
  ON public.apartment_pro_formas
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Employees can access their home builder's pro formas
CREATE POLICY "Employees can access home builder pro formas"
  ON public.apartment_pro_formas
  FOR ALL
  TO authenticated
  USING (owner_id = (SELECT home_builder_id FROM public.users WHERE id = auth.uid() AND role = 'employee' AND confirmed = true))
  WITH CHECK (owner_id = (SELECT home_builder_id FROM public.users WHERE id = auth.uid() AND role = 'employee' AND confirmed = true));

-- Updated at trigger
CREATE TRIGGER update_apartment_pro_formas_updated_at
  BEFORE UPDATE ON public.apartment_pro_formas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
