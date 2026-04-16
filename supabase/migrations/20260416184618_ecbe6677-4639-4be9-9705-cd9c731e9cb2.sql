ALTER TABLE public.project_budgets
ADD COLUMN IF NOT EXISTS manual_allocation_mode text
CHECK (manual_allocation_mode IS NULL OR manual_allocation_mode IN ('full', 'per-lot'));