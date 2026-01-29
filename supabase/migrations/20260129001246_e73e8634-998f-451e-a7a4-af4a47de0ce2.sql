-- Backfill the 01/28/2026 consolidated payment for Old Creek Homes at 6119 11th Street

-- Create the bill_payments record (without created_by since it's nullable)
INSERT INTO public.bill_payments (
  owner_id,
  payment_date,
  payment_account_id,
  vendor_id,
  project_id,
  total_amount,
  memo
) VALUES (
  '2653aba8-d154-4301-99bf-77d559492e19',
  '2026-01-28',
  '27ed0c3a-be95-4367-aa21-1a2b51ea1585',
  '4e36c64e-1af3-4566-aa01-10997cd285ab',
  'a50ae540-913d-481f-8e9f-72b64fa5a362',
  5826.00,
  'Backfill: Consolidated payment for 3 bills'
);

-- Create bill_payment_allocations for each bill
-- Bill 1: $100 (Ref: 06252025)
INSERT INTO public.bill_payment_allocations (bill_payment_id, bill_id, amount_allocated)
SELECT bp.id, '17a00f9c-2db4-4846-8832-976cce35d6cf', 100.00
FROM public.bill_payments bp
WHERE bp.payment_date = '2026-01-28'
  AND bp.vendor_id = '4e36c64e-1af3-4566-aa01-10997cd285ab'
  AND bp.project_id = 'a50ae540-913d-481f-8e9f-72b64fa5a362'
  AND bp.total_amount = 5826.00
LIMIT 1;

-- Bill 2: $776 (Ref: 07142025)
INSERT INTO public.bill_payment_allocations (bill_payment_id, bill_id, amount_allocated)
SELECT bp.id, '71113575-29a1-42a5-be3a-fd5bb96f51a6', 776.00
FROM public.bill_payments bp
WHERE bp.payment_date = '2026-01-28'
  AND bp.vendor_id = '4e36c64e-1af3-4566-aa01-10997cd285ab'
  AND bp.project_id = 'a50ae540-913d-481f-8e9f-72b64fa5a362'
  AND bp.total_amount = 5826.00
LIMIT 1;

-- Bill 3: $4,950 (no ref)
INSERT INTO public.bill_payment_allocations (bill_payment_id, bill_id, amount_allocated)
SELECT bp.id, 'b22414f6-bf06-4f36-bf8b-c54791687e9c', 4950.00
FROM public.bill_payments bp
WHERE bp.payment_date = '2026-01-28'
  AND bp.vendor_id = '4e36c64e-1af3-4566-aa01-10997cd285ab'
  AND bp.project_id = 'a50ae540-913d-481f-8e9f-72b64fa5a362'
  AND bp.total_amount = 5826.00
LIMIT 1;