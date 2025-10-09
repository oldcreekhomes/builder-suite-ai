-- Delete ELG Consulting bills and all associated data (bill lines, attachments, journal entries, journal entry lines)
-- Bill 1: 464462dc-aeb2-44e1-a8a4-75bff74d9c7a
SELECT delete_bill_with_journal_entries('464462dc-aeb2-44e1-a8a4-75bff74d9c7a'::uuid);

-- Bill 2: 8a51295b-0b08-4767-bcde-34d83bc1b8fc
SELECT delete_bill_with_journal_entries('8a51295b-0b08-4767-bcde-34d83bc1b8fc'::uuid);