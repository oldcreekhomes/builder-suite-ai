

# Split All Unallocated Bill Lines 50/50 Between Lot 1 and Lot 2

## What's Happening

The project "413 E Nelson Ave" has **28 bill lines** across both Paid and Approved bills that have no lot allocation (Address column shows "-"). Only a few bills (the most recent ones) were properly split between the two lots. The rest need to be split evenly.

## What We'll Do

Call the existing `split-bill-lines-by-lot` edge function with all 28 unallocated bill line IDs. This function will:

1. **Halve each existing line** and assign it to **Lot 1** (ceiling for odd pennies)
2. **Create a new duplicate line** assigned to **Lot 2** (floor for odd pennies)
3. Both lines keep the same cost code, memo, and other details -- only the amount and lot assignment change

## Bills Affected

| Vendor | Reference | Amount | Status |
|--------|-----------|--------|--------|
| Old Creek Homes, LLC | 07022025 | $100.00 | Posted |
| Wire Gill, LLP | 10891 | $722.50 (3 lines) | Paid |
| Old Creek Homes, LLC | 07092025 | $500.00 | Posted |
| Old Creek Homes, LLC | 07162025 | $1,168.00 | Posted |
| ELG Consulting, LLC | 248 | $460.00 | Paid |
| ELG Consulting, LLC | 239 | $120.00 | Paid |
| Old Creek Homes, LLC | (no ref) | $1,250.00 x3 | Posted |
| Old Creek Homes, LLC | 08112025 | $233.00 | Paid |
| Old Creek Homes, LLC | (no ref) | $5,400.00 | Posted |
| Old Creek Homes, LLC | 09102025 | $269.73 | Posted |
| Old Creek Homes, LLC | 09242025 | $1,495.92 | Posted |
| RC Fields & Associates | 55978 | $5,750.00 (2 lines) | Paid |
| City of Alexandria | 10272025 | $4,793.85 | Paid |
| Old Creek Homes, LLC | 11062025 | $1,250.00 | Paid |
| Anchor Loans | 11102025 | $5,400.00 | Paid |
| RC Fields & Associates | 56045 | $3,500.00 | Paid |
| Old Creek Homes, LLC | (no ref) | $3,112.50 | Posted |

## Technical Details

- **Lot 1 ID**: `a346f784-42bf-4734-a442-e9408a2257a5`
- **Lot 2 ID**: `2bc5967c-03c6-4de3-ac01-47773991fbf6`
- **28 bill line IDs** to split
- Uses the existing `split-bill-lines-by-lot` edge function (no code changes needed)
- The function uses the service role key, so it can update lines regardless of bill status
- After splitting, each bill's Address column will show "+2" indicating both lots are allocated

## After Splitting

Once complete, the A/P Aging report will show accurate per-lot breakdowns:
- **Lot 1**: approximately half of each bill's cost
- **Lot 2**: approximately half of each bill's cost
- **Total**: the full combined amount (should match the Balance Sheet)

