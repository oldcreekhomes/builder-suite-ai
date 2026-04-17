ALTER TABLE public.apartment_inputs
  ADD COLUMN IF NOT EXISTS market_units numeric NOT NULL DEFAULT 18,
  ADD COLUMN IF NOT EXISTS market_rent numeric NOT NULL DEFAULT 4400,
  ADD COLUMN IF NOT EXISTS affordable_units numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS affordable_rent numeric NOT NULL DEFAULT 2800;