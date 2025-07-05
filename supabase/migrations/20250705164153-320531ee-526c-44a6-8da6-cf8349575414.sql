-- Add notification columns to company_representatives table
ALTER TABLE public.company_representatives 
ADD COLUMN receive_bid_notifications BOOLEAN DEFAULT false,
ADD COLUMN receive_schedule_notifications BOOLEAN DEFAULT false;