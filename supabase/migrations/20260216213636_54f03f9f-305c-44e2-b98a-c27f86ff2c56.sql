
-- Step 1: Update existing bill line to $3,206 and link to "First floor" PO line
UPDATE bill_lines
SET amount = 3206.00,
    quantity = 1,
    unit_cost = 3206.00,
    memo = 'First floor balance',
    purchase_order_id = '1442c768-5aad-48b9-b3b9-455db4dc515b',
    purchase_order_line_id = 'd6032fa3-e23d-4982-b4c3-393650baee77',
    updated_at = now()
WHERE id = '1fe171b1-a965-4cbf-9932-d3a92965b961';

-- Step 2: Insert new bill line for $1,000 linked to "Decks" PO line
INSERT INTO bill_lines (
  bill_id, owner_id, line_number, line_type,
  project_id, cost_code_id, quantity, unit_cost, amount,
  memo, purchase_order_id, purchase_order_line_id
) VALUES (
  'b119f900-9804-40ad-9b12-8e166ff5e54d',
  '2653aba8-d154-4301-99bf-77d559492e19',
  2, 'job_cost',
  'f13eae11-ab55-4034-b70c-734fc3afe340',
  'd576bac6-59ef-4ce2-a4eb-97404150f37a',
  1, 1000.00, 1000.00,
  'Deck framing draw',
  '1442c768-5aad-48b9-b3b9-455db4dc515b',
  '15e25b7a-dd1a-4b0b-a1a2-d0eb1f0f82c1'
);
