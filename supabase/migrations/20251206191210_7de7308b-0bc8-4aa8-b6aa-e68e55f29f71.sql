-- Mark June 2025 reconciliation as completed (it has completed_at but status was still in_progress)
UPDATE public.bank_reconciliations 
SET status = 'completed'
WHERE id = 'e543fd5a-f9f6-4617-b9c1-50a63af1236b';

-- Delete orphaned July in-progress record
DELETE FROM public.bank_reconciliations 
WHERE id = '3e13ca47-03f2-40a2-b90f-68733826b903';