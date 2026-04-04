ALTER TABLE public.apartment_inputs
  ADD COLUMN tax_rate numeric NOT NULL DEFAULT 2.0,
  ADD COLUMN estimated_value numeric NOT NULL DEFAULT 25000000;