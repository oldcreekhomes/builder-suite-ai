# Remove February duplicate Carter Lumber payments (Oceanwatch, AUB)

## What's wrong (confirmed)
February has the same problem January had. The 02/16 Carter Lumber lump sum of $1,818.29 already pays four bills: $1,155.70, $404.00, $96.99 and $161.60. Those four bills were also saved again as separate payments dated 02/18. That's why they show up as extra items in Reconcile Accounts. None of them are reconciled.

## Fix (OW data only, no code change)
1. Before deleting anything, check whether the 02/18 payments also took money out of the bank a second time.
   - If they didn't, delete only the 4 duplicate payment records.
   - If they did, also remove their duplicate journal entries, so the bank balance and A/P stay correct.
2. Keep the 02/16 lump sum of $1,818.29.
3. Look through the rest of OW's AUB payments for the same pattern: one bill on both a lump sum and its own payment. This covers the Z.L. Chantry, Ocean Sands, Home Depot, Sea Ranch and L&L Drywall items flagged earlier. Fix the clear duplicates the same way, and list anything that's unclear.

## Verification
- February in Reconcile Accounts shows only the $1,818.29 Carter line.
- The AUB book balance stays the same, or comes back down to the correct amount if there was a second bank withdrawal.

## Technical details
- Duplicate `bill_payments`: 6b3104ca, 92b0be5e, b5fc9ea1, e07bf3ab. Their bills are already allocated to lump sum fe79d4cc.
- Check `journal_entries` with source_type bill_payment for those IDs before deleting the allocations and payments.
