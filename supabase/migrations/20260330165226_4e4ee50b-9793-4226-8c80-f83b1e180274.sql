-- Update journal entry debit line: change account to WIP and set cost code to 4040 Office Supplies
UPDATE journal_entry_lines 
SET account_id = 'c9a35605-2470-4d83-989f-32c51f4d7ec4', 
    cost_code_id = '846f4d07-3d11-487e-a030-8df25bc8f747' 
WHERE id = 'e8cc9132-4bd8-4eff-a58a-e3ff368bdf96';