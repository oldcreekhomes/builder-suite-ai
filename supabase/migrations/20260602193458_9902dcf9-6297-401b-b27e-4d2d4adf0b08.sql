WITH targets(cost_code_id, amt) AS (
  VALUES
    ('15a09918-383e-41a0-b051-1a9b50408658'::uuid, 275.15),  -- 4300 Termite Treatment
    ('2b3e88bc-6f90-479e-b0a7-07d51d115934'::uuid, 882.15)   -- 2540 Warranty Purchase
)
INSERT INTO public.project_budgets
  (project_id, lot_id, cost_code_id, actual_amount, quantity, unit_price, budget_source)
SELECT
  'd9e400a0-f9b9-40c6-8b8e-183341e508f3'::uuid,
  '5d28a702-82fa-4416-8d86-d47c24f8a566'::uuid,
  t.cost_code_id, t.amt, 1, 0, 'manual'
FROM targets t
ON CONFLICT (project_id, cost_code_id, COALESCE(lot_id, '00000000-0000-0000-0000-000000000000'::uuid))
DO UPDATE SET
  actual_amount = COALESCE(public.project_budgets.actual_amount, 0) + EXCLUDED.actual_amount,
  budget_source = 'manual';