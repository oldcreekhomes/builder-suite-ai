
-- Fix bill_lines: set qty=1, correct unit_cost and amount
UPDATE bill_lines SET quantity = 1, unit_cost = 8.48, amount = 8.48 WHERE id = '340874ca-da70-4780-9f76-6438c66cdb33';
UPDATE bill_lines SET quantity = 1, unit_cost = 8.49, amount = 8.49 WHERE id = '346f2b5f-e030-40cf-963c-ab7cdc1908fb';

-- Fix bills total
UPDATE bills SET total_amount = 16.97 WHERE id = '271ee4cc-5178-44c6-86a7-d7b79dee3e26';

-- Fix journal entry lines
UPDATE journal_entry_lines SET debit = 8.48 WHERE id = 'e7bcfe09-4a74-472a-98c5-2c76a5840076';
UPDATE journal_entry_lines SET debit = 8.49 WHERE id = '7f08dfab-bba6-41ad-8279-08eb1afcc8d0';
UPDATE journal_entry_lines SET credit = 16.97 WHERE id = '04c3b056-3f8f-4bce-94bf-75d873f70bd1';
