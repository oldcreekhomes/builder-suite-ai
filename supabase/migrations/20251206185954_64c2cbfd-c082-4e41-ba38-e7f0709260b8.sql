-- Fix May 2025 completed reconciliation: change from 2025-05-23 to 2025-05-31
UPDATE public.bank_reconciliations 
SET statement_date = '2025-05-31'
WHERE id = 'e6490e53-1f41-40db-8890-4a07c7261d4f';

-- Fix June 2025 in-progress reconciliation: change from 2025-06-28 to 2025-06-30
UPDATE public.bank_reconciliations 
SET statement_date = '2025-06-30'
WHERE id = 'e543fd5a-f9f6-4617-b9c1-50a63af1236b';

-- Delete orphaned May 11 in-progress record
DELETE FROM public.bank_reconciliations 
WHERE id = '30bae538-b046-4185-bedd-15fa129afc73';