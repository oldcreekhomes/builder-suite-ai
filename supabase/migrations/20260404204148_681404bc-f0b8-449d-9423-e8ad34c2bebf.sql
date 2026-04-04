ALTER TABLE public.apartment_inputs
ADD COLUMN target_cap_rate numeric NOT NULL DEFAULT 0,
ADD COLUMN target_dscr numeric NOT NULL DEFAULT 0,
ADD COLUMN target_cash_on_cash numeric NOT NULL DEFAULT 0,
ADD COLUMN target_irr numeric NOT NULL DEFAULT 0,
ADD COLUMN target_grm numeric NOT NULL DEFAULT 0,
ADD COLUMN exit_cap_rate numeric NOT NULL DEFAULT 0,
ADD COLUMN hold_period_years numeric NOT NULL DEFAULT 5,
ADD COLUMN rent_growth_rate numeric NOT NULL DEFAULT 0,
ADD COLUMN expense_growth_rate numeric NOT NULL DEFAULT 0,
ADD COLUMN closing_costs numeric NOT NULL DEFAULT 0;