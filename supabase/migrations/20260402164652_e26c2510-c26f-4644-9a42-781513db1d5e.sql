-- 1. Update Purchase Order cost_code_id from 4200 to 3340
UPDATE public.project_purchase_orders
SET cost_code_id = '5aef3665-9d65-4402-893c-1e0a1ac9f15c'
WHERE id = 'f2110af9-eb0a-4f02-bbe8-2d9f798ab8b6';

-- 2. Update PO Line Item cost_code_id from 4200 to 3340
UPDATE public.purchase_order_lines
SET cost_code_id = '5aef3665-9d65-4402-893c-1e0a1ac9f15c'
WHERE id = '834733b4-dca9-4183-af83-ad4a7a17b7dc';

-- 3. Update Bid Package cost_code_id from 4200 to 3340
UPDATE public.project_bid_packages
SET cost_code_id = '5aef3665-9d65-4402-893c-1e0a1ac9f15c'
WHERE id = 'e1ebf73b-ba72-42df-91ac-64bbbdf97fae';

-- 4. Update Budget for 3340 (Earthwork) to use purchase-orders source
UPDATE public.project_budgets
SET budget_source = 'purchase-orders',
    unit_price = 14975.96,
    quantity = 1
WHERE id = '8aa7b3e6-8c45-4c43-b799-4162be1e3545';

-- 5. Reset Budget for 4200 (Excavation) since PO is removed
UPDATE public.project_budgets
SET budget_source = 'manual',
    unit_price = 0,
    selected_bid_id = NULL,
    historical_project_id = NULL,
    historical_lot_id = NULL
WHERE id = 'c686175a-bded-4318-9405-dd88af103c4c';