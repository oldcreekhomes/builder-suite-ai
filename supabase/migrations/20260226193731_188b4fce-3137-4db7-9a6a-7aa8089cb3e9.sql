
-- Step 1: Merge actual_amounts on project_budgets (add 4780 amounts to 4770 rows)
UPDATE project_budgets SET actual_amount = 8400 WHERE id = '7994fa29-9ad3-4671-8713-9835ca00bccb';
UPDATE project_budgets SET actual_amount = 4176 WHERE id = '43547541-4a73-468b-a17b-b2e5bc00a35f';
UPDATE project_budgets SET actual_amount = 5164 WHERE id = '484d12e8-99df-4b1d-9c20-f466b97b6e94';

-- Step 2: Delete all 4780 project_budget rows
DELETE FROM project_budgets WHERE cost_code_id = '69307bee-4764-41ce-92ae-d4321e0a56a7';

-- Step 3: Reassign foreign keys from 4780 to 4770
UPDATE project_purchase_orders SET cost_code_id = 'afa82c53-2791-4600-b630-f5df2756fbd2' WHERE cost_code_id = '69307bee-4764-41ce-92ae-d4321e0a56a7';
UPDATE project_bid_packages SET cost_code_id = 'afa82c53-2791-4600-b630-f5df2756fbd2' WHERE cost_code_id = '69307bee-4764-41ce-92ae-d4321e0a56a7';
UPDATE purchase_order_lines SET cost_code_id = 'afa82c53-2791-4600-b630-f5df2756fbd2' WHERE cost_code_id = '69307bee-4764-41ce-92ae-d4321e0a56a7';
UPDATE cost_code_price_history SET cost_code_id = 'afa82c53-2791-4600-b630-f5df2756fbd2' WHERE cost_code_id = '69307bee-4764-41ce-92ae-d4321e0a56a7';

-- Step 4: Delete 4780 specifications (both duplicates)
DELETE FROM cost_code_specifications WHERE cost_code_id IN ('69307bee-4764-41ce-92ae-d4321e0a56a7', 'a96c503d-6c0e-4b1a-8b1a-4b0a8b1a4b0a');

-- Step 5: Delete orphan 4770 spec and duplicate cost_code record
DELETE FROM cost_code_specifications WHERE cost_code_id = 'a9a19650-1234-5678-9abc-def012345678';
DELETE FROM cost_codes WHERE id = 'a9a19650-1234-5678-9abc-def012345678';

-- Step 6: Delete both 4780 cost_code records
DELETE FROM cost_codes WHERE id = '69307bee-4764-41ce-92ae-d4321e0a56a7';
DELETE FROM cost_codes WHERE id = 'a96c503d-6c0e-4b1a-8b1a-4b0a8b1a4b0a';
