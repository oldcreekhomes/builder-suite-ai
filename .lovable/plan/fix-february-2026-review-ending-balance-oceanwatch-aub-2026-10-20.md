# Fix February 2026 review ending balance (Oceanwatch, AUB)

## What's wrong (confirmed)
The bottom of the review adds up exactly the items saved to the February reconciliation: $101,788.21 + $117.33 − $66,903.67 = $35,001.87. So the math on the screen is right, but the list of items saved to February is wrong. It's $1,931.52 too high on the payment side.

Found so far:
- **Z.L. Chantry $1,431.00, dated 5/12/2026**, is saved as cleared in February. It's the second copy of the 2/23 payment for the same bill (one of the duplicates flagged yesterday). A May payment can't clear in February.
- That leaves **$500.52** still unexplained. I haven't found it yet.

## Fix (OW data only, no code change)
1. Find the remaining $500.52. Check the February items for anything else dated outside February or paid twice, and compare against the statement.
2. Remove the 5/12 Z.L. Chantry item from February. If it's a true duplicate (one bill, paid twice), delete the duplicate payment and its bank entry so the bank and A/P are correct.
3. Fix the $500.52 item the same way once identified. I'll report it before changing anything that's unclear.
4. Confirm the bottom shows $36,933.39 and the difference is $0.00. Check that March still starts from $36,933.39.

## Technical details
- Reconciliation `6fb4df6c-2b8c-4dfd-b8ad-1bef1a945e8f`. Its tagged bank JE lines sum to $35,001.87 vs. the $36,933.39 statement.
- Z.L. Chantry bill source_id `01b3a3a6-4180-4448-913c-b656ba9d8e02` has two $1,431.00 bill_payment JEs (2/23 and 5/12), both with `reconciliation_id` set to February.
