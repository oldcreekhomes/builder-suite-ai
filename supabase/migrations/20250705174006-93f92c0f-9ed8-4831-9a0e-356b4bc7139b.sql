-- Move bidding fields from project_bidding to project_bidding_companies table
-- First remove the columns from project_bidding
ALTER TABLE public.project_bidding 
DROP COLUMN price,
DROP COLUMN proposals,
DROP COLUMN due_date,
DROP COLUMN reminder_date;

-- Add the columns to project_bidding_companies
ALTER TABLE public.project_bidding_companies 
ADD COLUMN price NUMERIC DEFAULT 0,
ADD COLUMN proposals TEXT DEFAULT NULL,
ADD COLUMN due_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN reminder_date TIMESTAMP WITH TIME ZONE DEFAULT NULL;