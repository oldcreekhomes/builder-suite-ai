UPDATE bills SET total_amount = 28915.50, status = 'paid' WHERE id = '3ee6bbb9-b3b1-476a-9e82-cdef127d630c';

UPDATE bill_lines SET amount = 28915.50, unit_cost = 28915.50 WHERE bill_id = '3ee6bbb9-b3b1-476a-9e82-cdef127d630c' AND line_type = 'job_cost';

UPDATE journal_entry_lines SET debit = 28915.50 WHERE id = '0bc84d69-07ca-4121-a84b-8068b631865c';
UPDATE journal_entry_lines SET credit = 28915.50 WHERE id = '52e2b16c-d397-4b8c-a7d1-39b7535b1f4d';