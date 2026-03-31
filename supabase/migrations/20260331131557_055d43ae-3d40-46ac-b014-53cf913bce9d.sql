ALTER TABLE public.project_budgets 
ADD COLUMN IF NOT EXISTS historical_lot_id UUID REFERENCES public.project_lots(id) ON DELETE SET NULL;