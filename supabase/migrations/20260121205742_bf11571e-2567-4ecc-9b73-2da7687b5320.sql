-- Fix: Update bill_payment_allocation to point to the corrected bill (4350: Roof Trusses)
UPDATE bill_payment_allocations 
SET bill_id = '4293bf69-d521-495b-a923-37da92f30857'
WHERE bill_payment_id = '7c530693-c061-4497-b269-7e12eb56db5a'
  AND bill_id = 'd31e8ccf-c574-43f5-a9c0-93166f11cf5e';

-- Fix: Delete the phantom Dec 17 payment journal entry lines first
DELETE FROM journal_entry_lines 
WHERE journal_entry_id = 'b1b1face-6cf6-46f1-b8df-691112c34843';

-- Fix: Delete the phantom Dec 17 payment journal entry
DELETE FROM journal_entries 
WHERE id = 'b1b1face-6cf6-46f1-b8df-691112c34843';