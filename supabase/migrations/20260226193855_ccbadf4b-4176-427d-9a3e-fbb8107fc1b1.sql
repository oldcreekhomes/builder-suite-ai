
-- Delete orphan specs for remaining duplicates
DELETE FROM cost_code_specifications WHERE cost_code_id IN ('a9a19650-b484-4495-95f0-44addfd169e8', 'a96c503d-c877-4efc-bc2e-b76acbf39c9c');

-- Delete duplicate 4770 and remaining 4780 cost_code records
DELETE FROM cost_codes WHERE id = 'a9a19650-b484-4495-95f0-44addfd169e8';
DELETE FROM cost_codes WHERE id = 'a96c503d-c877-4efc-bc2e-b76acbf39c9c';
