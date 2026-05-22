UPDATE bills SET total_amount=40504.13, updated_at=now() WHERE id='dea764ee-e624-4731-af47-3c1d392f4a98';
UPDATE bill_lines SET amount=20252.06, unit_cost=40504.12, updated_at=now() WHERE id='c6f908be-6582-485c-9f5c-28ca1dee5ece';
UPDATE journal_entry_lines SET debit=20252.06, updated_at=now() WHERE id='f106cc98-2572-4d5f-a82f-ead16830e71b';
UPDATE journal_entry_lines SET credit=40504.13, updated_at=now() WHERE id='489a889c-5b70-47ac-a750-3ef6666a3478';