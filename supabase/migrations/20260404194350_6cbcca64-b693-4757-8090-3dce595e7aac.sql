ALTER TABLE public.apartment_inputs
  ADD COLUMN landscaping numeric NOT NULL DEFAULT 0,
  ADD COLUMN trash_removal numeric NOT NULL DEFAULT 0,
  ADD COLUMN pest_control numeric NOT NULL DEFAULT 0,
  ADD COLUMN security numeric NOT NULL DEFAULT 0,
  ADD COLUMN professional_fees numeric NOT NULL DEFAULT 0,
  ADD COLUMN capex_reserve numeric NOT NULL DEFAULT 0,
  ADD COLUMN other_misc numeric NOT NULL DEFAULT 0;