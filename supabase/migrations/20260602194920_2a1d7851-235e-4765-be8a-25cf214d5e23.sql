
INSERT INTO public.project_budgets (project_id, lot_id, cost_code_id, quantity, unit_price, budget_source)
SELECT '691271e6-e46f-4745-8efb-200500e819f0', 'eed5fd66-ef04-4fa9-a6ae-729862c1c489', '3461c8ce-6ec5-4466-a164-1640e042efb7', 1, 5924.28, 'manual'
WHERE NOT EXISTS (
  SELECT 1 FROM public.project_budgets
  WHERE project_id = '691271e6-e46f-4745-8efb-200500e819f0'
    AND lot_id = 'eed5fd66-ef04-4fa9-a6ae-729862c1c489'
    AND cost_code_id = '3461c8ce-6ec5-4466-a164-1640e042efb7'
);
