-- Delete all existing bills and their associated data (journal entries, bill lines, attachments)
-- Using the existing delete_bill_with_journal_entries function

DO $$
DECLARE
  bill_record RECORD;
BEGIN
  -- Loop through all bills and delete them with their associated data
  FOR bill_record IN SELECT id FROM public.bills
  LOOP
    PERFORM delete_bill_with_journal_entries(bill_record.id);
  END LOOP;
END $$;