-- Add new columns to project_bidding table
ALTER TABLE public.project_bidding 
ADD COLUMN price NUMERIC DEFAULT 0,
ADD COLUMN proposals TEXT DEFAULT NULL, -- Store file path/name for uploaded proposals
ADD COLUMN due_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN reminder_date TIMESTAMP WITH TIME ZONE DEFAULT NULL;