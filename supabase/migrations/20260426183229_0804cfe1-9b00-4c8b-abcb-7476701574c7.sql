UPDATE pending_bill_lines pbl
SET cost_code_id = pol.cost_code_id,
    cost_code_name = cc.code || ': ' || cc.name
FROM purchase_order_lines pol
JOIN cost_codes cc ON cc.id = pol.cost_code_id
WHERE pbl.purchase_order_line_id = pol.id
  AND pbl.purchase_order_line_id IS NOT NULL
  AND pol.cost_code_id IS NOT NULL
  AND pbl.cost_code_id IS DISTINCT FROM pol.cost_code_id;