
-- Fix the incorrect credit application JE from Jan 27, 2026
-- JE 4b3dbb7c incorrectly debits Cash (1010) $500 for credit memo OCH-02302
-- It should debit A/P instead (internal A/P offset, not a cash transaction)
-- This will reduce the cash balance by $150 (the net discrepancy)

-- Change the cash debit line to debit A/P instead
UPDATE journal_entry_lines
SET account_id = 'f1564c78-a440-403f-9734-9845a424681f',  -- Accounts Payable (2010)
    memo = 'Credit offset applied - OCH-02302'
WHERE id = (
  SELECT jel.id
  FROM journal_entry_lines jel
  JOIN accounts a ON a.id = jel.account_id
  WHERE jel.journal_entry_id = '4b3dbb7c-e701-407e-9756-170ca73e4a4c'
    AND a.code = '1010'
    AND jel.debit = 500.00
);

-- Also fix the March credit application JEs that incorrectly debit cash
-- JE dd02eeca (Mar 7): Change cash debit to A/P debit
UPDATE journal_entry_lines
SET account_id = 'f1564c78-a440-403f-9734-9845a424681f',
    memo = 'Credit offset applied - OCH-02302'
WHERE id = '27120422-0515-404c-8591-c37e2a21340f';

-- JE 806e6b70 (Mar 9): Change cash debit to A/P debit  
UPDATE journal_entry_lines
SET account_id = 'f1564c78-a440-403f-9734-9845a424681f',
    memo = 'Credit offset applied - OCH-02302'
WHERE id = '3d6f2185-bb5f-4486-8010-5c2f25d70267';
