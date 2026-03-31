UPDATE project_budgets
SET historical_lot_id = '8ae0a660-59f6-4289-9943-e7fcc0107548'
WHERE project_id = '691271e6-e46f-4745-8efb-200500e819f0'
  AND budget_source = 'historical'
  AND historical_project_id = 'd9e400a0-f9b9-40c6-8b8e-183341e508f3'
  AND cost_code_id IN (SELECT id FROM cost_codes WHERE parent_group = '4000');