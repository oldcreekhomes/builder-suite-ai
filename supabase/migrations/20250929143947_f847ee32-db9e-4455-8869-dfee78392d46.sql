-- Add actual_amount column to project_budgets table
ALTER TABLE public.project_budgets 
ADD COLUMN actual_amount numeric DEFAULT 0;