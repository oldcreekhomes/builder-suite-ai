# Credit Cards: add Reference No. box

## What changes
- A new **Reference No.** box goes on the credit card screen, between Vendor and Attachments, just like on bills.
- To make room, Vendor gets a little narrower and Attachments a little narrower: Credit Card Account stays the same, Vendor shrinks from 7 to 5 of 12 widths, Reference No. takes 2, and Attachments stays at 2.
- **Purchase and Refund** use the same screen, so both get the identical box in the identical place.
- The reference number is saved with the charge or refund. It comes back when you open the entry from Search or the arrows, and is cleared by New or Clear.
- It's optional; you can still save without it.
- The reference number also shows in the credit card Search results so you can find a charge by it.

## Technical details
- Migration: `ALTER TABLE public.credit_cards ADD COLUMN reference_number text;`. Existing grants and row access rules already cover the new column.
- `CreditCardsContent.tsx`: add `referenceNumber` state, the `Input` (h-10) in a `col-span-2` cell, and change Vendor to `col-span-5`. Include it in insert/update payloads, load it on edit, reset it in clear/new, and copy it on Memorize where other header fields are copied.
- Check the credit card save hook/RPC and the search dialog for the payload and display, and pass `reference_number` through.
- Correcting a posted card (reversal + new entry) carries `reference_number` to the new row.
