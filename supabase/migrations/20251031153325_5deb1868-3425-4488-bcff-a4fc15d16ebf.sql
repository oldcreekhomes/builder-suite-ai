-- Add amount_paid column to bills table for partial payment tracking
ALTER TABLE public.bills 
ADD COLUMN amount_paid numeric DEFAULT 0 NOT NULL;

-- Update existing 'paid' bills to show full amount paid
UPDATE public.bills 
SET amount_paid = total_amount 
WHERE status = 'paid';

-- Add comment to document the column
COMMENT ON COLUMN public.bills.amount_paid IS 'Tracks the cumulative amount paid on this bill. Bills remain open until amount_paid >= total_amount.';