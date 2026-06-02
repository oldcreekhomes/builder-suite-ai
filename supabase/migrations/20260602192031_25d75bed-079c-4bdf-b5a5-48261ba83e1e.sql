-- Reallocate Lot 506's 4010 rollup into proper sub-codes per PDF
WITH targets(cost_code_id, new_actual) AS (
  VALUES
    ('0f3e1372-1374-4b8d-aca7-c6520aa3c987'::uuid, 92.34),     -- 4010 Parking
    ('76731afb-e333-4427-9650-5b1e9dab2080'::uuid, 4.29),      -- 4015 Office
    ('aa71bf5d-62ea-445f-9d21-b700b12f9930'::uuid, 6198.14),   -- 4020 PM
    ('9e252923-7360-4e6b-affd-e62a972fc88b'::uuid, 97.56),     -- 4025 Accounting
    ('5b9e9ac8-1da3-4378-876c-b2804f4c7e69'::uuid, 124.32),    -- 4030 Other
    ('846f4d07-3d11-487e-a030-8df25bc8f747'::uuid, 449.68)     -- 4040 Office Supplies
)
INSERT INTO public.project_budgets
  (project_id, lot_id, cost_code_id, actual_amount, quantity, unit_price, budget_source)
SELECT
  'd9e400a0-f9b9-40c6-8b8e-183341e508f3'::uuid,
  '5d28a702-82fa-4416-8d86-d47c24f8a566'::uuid,
  t.cost_code_id,
  t.new_actual,
  1,
  0,
  'manual'
FROM targets t
ON CONFLICT (project_id, cost_code_id, COALESCE(lot_id, '00000000-0000-0000-0000-000000000000'::uuid))
DO UPDATE SET actual_amount = EXCLUDED.actual_amount, budget_source = 'manual';