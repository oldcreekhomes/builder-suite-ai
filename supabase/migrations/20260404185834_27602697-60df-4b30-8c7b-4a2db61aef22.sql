CREATE TABLE public.apartment_inputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  number_of_units integer NOT NULL DEFAULT 200,
  avg_rent_per_unit numeric NOT NULL DEFAULT 1500,
  vacancy_rate numeric NOT NULL DEFAULT 5,
  purchase_price numeric NOT NULL DEFAULT 25000000,
  ltv numeric NOT NULL DEFAULT 75,
  interest_rate numeric NOT NULL DEFAULT 6.5,
  amortization_years integer NOT NULL DEFAULT 30,
  loan_term_years integer NOT NULL DEFAULT 30,
  taxes numeric NOT NULL DEFAULT 500000,
  insurance numeric NOT NULL DEFAULT 250000,
  utilities numeric NOT NULL DEFAULT 200000,
  repairs_maintenance numeric NOT NULL DEFAULT 180000,
  management_fee_percent numeric NOT NULL DEFAULT 5,
  payroll numeric NOT NULL DEFAULT 200000,
  general_admin numeric NOT NULL DEFAULT 100000,
  marketing numeric NOT NULL DEFAULT 50000,
  reserves_per_unit numeric NOT NULL DEFAULT 295,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(project_id)
);

ALTER TABLE public.apartment_inputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own apartment inputs"
  ON public.apartment_inputs FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Employees can access owner apartment inputs"
  ON public.apartment_inputs FOR ALL
  TO authenticated
  USING (owner_id IN (SELECT home_builder_id FROM public.users WHERE id = auth.uid()))
  WITH CHECK (owner_id IN (SELECT home_builder_id FROM public.users WHERE id = auth.uid()));

CREATE TRIGGER update_apartment_inputs_updated_at
  BEFORE UPDATE ON public.apartment_inputs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();