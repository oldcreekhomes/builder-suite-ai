
-- Delete specifications for Erica Gray Homes' cost codes
DELETE FROM cost_code_specifications 
WHERE cost_code_id IN (SELECT id FROM cost_codes WHERE owner_id = 'bfdbd789-0cd2-4b79-bc5f-51d28e2a3bc4');

-- Delete cost codes for Erica Gray Homes
DELETE FROM cost_codes WHERE owner_id = 'bfdbd789-0cd2-4b79-bc5f-51d28e2a3bc4';
