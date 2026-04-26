-- 1. Delete test PO 2026-214N-0003 (purchase_order_lines cascade)
DELETE FROM public.project_purchase_orders
WHERE id = 'dc01c0a2-c7dc-4653-9b0d-6b777f010089';

-- 2. Renumber via temporary placeholders to avoid any unique-index conflicts
UPDATE public.project_purchase_orders
SET po_number = 'TMP-0001'
WHERE id = 'a9a8c3b1-a6df-439e-be61-cf1152f7e146';

UPDATE public.project_purchase_orders
SET po_number = 'TMP-0002'
WHERE id = '2accd099-25de-4a92-8fd8-89e322011b97';

UPDATE public.project_purchase_orders
SET po_number = '2026-214N-0001'
WHERE id = 'a9a8c3b1-a6df-439e-be61-cf1152f7e146';

UPDATE public.project_purchase_orders
SET po_number = '2026-214N-0002'
WHERE id = '2accd099-25de-4a92-8fd8-89e322011b97';

-- 3. Reset PO counter so next PO = 2026-214N-0003
UPDATE public.project_po_counters
SET current_number = 2,
    updated_at = now()
WHERE project_id = 'b967fc5a-6ac6-4129-afe7-b67d51a5db05';