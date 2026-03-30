-- Delete Warranty Purchase row from 2000s (should be in 4000s per spreadsheet)
DELETE FROM project_budgets WHERE id = '36295682-e159-491d-b994-bc0e01ac7798';

-- Update General Conditions to absorb the $882.15 from Warranty Purchase
UPDATE project_budgets SET actual_amount = 4588.50 WHERE id = 'cfc4a4cb-f20d-4cac-b76b-b4801aeb9b0d';