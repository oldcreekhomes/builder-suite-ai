-- Create missing POs for closed bid packages that have submitted bids with prices
INSERT INTO project_purchase_orders (
  project_id, 
  company_id, 
  cost_code_id, 
  total_amount, 
  status, 
  bid_package_id, 
  notes,
  created_by
)
SELECT 
  bp.project_id,
  b.company_id,
  bp.cost_code_id,
  b.price,
  'approved',
  bp.id,
  'Auto-generated PO for previously closed bid',
  p.owner_id
FROM project_bid_packages bp
JOIN project_bids b ON b.bid_package_id = bp.id 
  AND b.bid_status = 'submitted' 
  AND b.price IS NOT NULL 
  AND b.price > 0
JOIN projects p ON p.id = bp.project_id
LEFT JOIN project_purchase_orders po 
  ON po.project_id = bp.project_id 
  AND po.cost_code_id = bp.cost_code_id 
  AND po.company_id = b.company_id
WHERE bp.status = 'closed'
  AND po.id IS NULL;