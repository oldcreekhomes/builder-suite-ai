-- Delete the duplicate payment journal entry created by Matt Gray on 04/29/2026
DELETE FROM public.journal_entry_lines WHERE journal_entry_id = '1d83eb73-4b6e-4092-83b2-1aeee05f8a5f';
DELETE FROM public.journal_entries WHERE id = '1d83eb73-4b6e-4092-83b2-1aeee05f8a5f';

-- Roll the bill back to partially paid and strip Matt's "Paid" note
UPDATE public.bills
SET amount_paid = 28915.50,
    status = 'posted',
    notes = 'Jole Ann Sorensen | 02/27/2026: Partial payment

Jole Ann Sorensen | 02/25/2026: Yes, we are only paying half. This is only invoice, we will be only paying half as the deposit request. For instance, I will send a check of $28,915.50. I will put in BS the payment we made of $28,915.50. Then the invoice will show after we have remaining balance of $28,915.50.

Raymond Zins: We only require 50% deposit to schedule.'
WHERE id = '3ee6bbb9-b3b1-476a-9e82-cdef127d630c';