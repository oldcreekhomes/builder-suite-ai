-- Clean database for fresh testing - delete all bills and journal entries
-- Order is important due to foreign key relationships

-- Delete journal entry lines first
DELETE FROM public.journal_entry_lines;

-- Delete journal entries
DELETE FROM public.journal_entries;

-- Delete bill lines
DELETE FROM public.bill_lines;

-- Delete bill attachments
DELETE FROM public.bill_attachments;

-- Delete bills
DELETE FROM public.bills;