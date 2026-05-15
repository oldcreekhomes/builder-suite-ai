DELETE FROM journal_entry_lines WHERE journal_entry_id='373459db-e68a-4bf5-8771-fab2b5e9c6ce';
DELETE FROM journal_entries WHERE id='373459db-e68a-4bf5-8771-fab2b5e9c6ce';
UPDATE bills SET status='draft', updated_at=now() WHERE id='4012eabc-d168-462d-8cf6-1de7c92712cf';