-- Remove existing cost code associations for Washington Gas and Dominion Energy
DELETE FROM public.company_cost_codes 
WHERE company_id IN ('93ea13e0-0818-4eae-b15a-1892a92dcea2', '892a5c8a-966e-4810-94f6-718a1728eea6');

-- Add new cost code association (2150 - Utility Tap Fees) for both companies
INSERT INTO public.company_cost_codes (company_id, cost_code_id)
VALUES 
  ('93ea13e0-0818-4eae-b15a-1892a92dcea2', '8c3c2aab-b1a5-4690-b1e0-f25d55101e29'), -- Washington Gas
  ('892a5c8a-966e-4810-94f6-718a1728eea6', '8c3c2aab-b1a5-4690-b1e0-f25d55101e29'); -- Dominion Energy