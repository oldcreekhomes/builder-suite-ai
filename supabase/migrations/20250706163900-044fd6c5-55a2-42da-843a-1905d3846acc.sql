-- Add bid package fields to existing project_bidding table
ALTER TABLE public.project_bidding 
ADD COLUMN due_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN reminder_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN reminder_day_of_week INTEGER CHECK (reminder_day_of_week BETWEEN 0 AND 6),
ADD COLUMN specifications TEXT,
ADD COLUMN name TEXT;