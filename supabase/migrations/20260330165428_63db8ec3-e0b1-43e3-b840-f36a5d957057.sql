-- Update bill line: change from expense/1020 Deposits to job_cost/4040 Office Supplies
UPDATE bill_lines 
SET cost_code_id = '846f4d07-3d11-487e-a030-8df25bc8f747', 
    account_id = NULL, 
    line_type = 'job_cost' 
WHERE id = 'a4f7a8ba-3c74-496b-ad59-be9139b64b06';