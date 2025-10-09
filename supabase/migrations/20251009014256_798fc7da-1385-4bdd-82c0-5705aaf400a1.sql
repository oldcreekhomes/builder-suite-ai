-- Drop the old constraint that's causing the 400 error
ALTER TABLE public.pending_bill_uploads 
DROP CONSTRAINT IF EXISTS pending_bill_uploads_status_check;

-- Add new constraint with expanded status values including 'approved', 'rejected', 'reviewing', and 'completed'
ALTER TABLE public.pending_bill_uploads
ADD CONSTRAINT pending_bill_uploads_status_check 
CHECK (status IN ('pending', 'processing', 'extracted', 'error', 'approved', 'rejected', 'reviewing', 'completed'));