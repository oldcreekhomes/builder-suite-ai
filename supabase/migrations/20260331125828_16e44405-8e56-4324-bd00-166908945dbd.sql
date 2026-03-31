-- Update all 4000-series budget items for Nob Hill Court to historical source
-- matching Stevenson Ave Lot 507 actual costs by cost code name
UPDATE project_budgets pb
SET budget_source = 'historical',
    historical_project_id = 'd9e400a0-f9b9-40c6-8b8e-183341e508f3',
    quantity = 1,
    unit_price = COALESCE(
      (SELECT hist.actual_amount 
       FROM project_budgets hist
       JOIN cost_codes hist_cc ON hist_cc.id = hist.cost_code_id
       JOIN cost_codes nob_cc ON nob_cc.id = pb.cost_code_id
       WHERE hist.project_id = 'd9e400a0-f9b9-40c6-8b8e-183341e508f3'
         AND hist.lot_id = '8ae0a660-59f6-4289-9943-e7fcc0107548'
         AND hist_cc.code = nob_cc.code
       LIMIT 1),
      0
    )
WHERE pb.project_id = '691271e6-e46f-4745-8efb-200500e819f0'
  AND pb.cost_code_id IN (
    SELECT id FROM cost_codes WHERE parent_group = '4000'
  );