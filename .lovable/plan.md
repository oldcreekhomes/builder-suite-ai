

# Split Unallocated Bills 50/50 for 412 E Nelson

## Summary

Project "412 E Nelson" has 2 lots but 20 bills with unallocated line items (no lot assigned). 8 bills already have proper lot allocations and will be left alone. This fix will split every unallocated bill line 50/50 between Lot 1 and Lot 2, along with their corresponding journal entries.

## What's Already Allocated (no changes needed)

| Reference | Status | Lines |
|-----------|--------|-------|
| 02022026-412 | posted | 2 lines, both allocated |
| 02092026-412ENelson | posted | 2 lines, both allocated |
| 1092026 | paid | 2 lines, both allocated |
| 11893 (void) | void | 12 lines, all allocated |
| 12092025 | paid | 2 lines, both allocated |
| 12275 | draft | 6 lines, all allocated |
| 12428-412 E Nelson | draft | 20 lines, all allocated |
| INV-2026-00000995 | draft | 6 lines, all allocated |

## What Needs Splitting (20 bills, ~25 lines)

| Reference | Status | Amount | Lines | Has JE? | Has Payment JE? |
|-----------|--------|--------|-------|---------|-----------------|
| 07022025 | posted | $100.00 | 1 | Yes | No |
| 07092025 | posted | $500.00 | 1 | Yes | No |
| 07162025 | posted | $1,168.00 | 1 | Yes | No |
| 08112025 | paid | $233.00 | 1 | Yes | Yes |
| 08122025 | posted | $1,250.00 | 1 | Yes | No |
| 09092025 | posted | $6,000.00 | 1 | Yes | No |
| 09102025 | posted | $269.72 | 1 | Yes | No |
| 09242025 | posted | $1,495.92 | 1 | Yes | No |
| 10022025 | posted | $1,250.00 | 1 | Yes | No |
| 10272025 | posted | $3,112.50 | 1 | Yes | No |
| 10272025 | paid | $5,194.49 | 1 | Yes | Yes |
| 10891 | paid | $722.50 | 3 | Yes | Yes |
| 11062025 | paid | $1,250.00 | 1 | Yes | Yes |
| 11102025 | paid | $6,000.00 | 1 | Yes | Yes |
| 11893 | posted | $1,190.00 | 6 | Yes | No |
| 238 | paid | $180.00 | 1 | Yes | Yes |
| 247 | paid | $480.00 | 1 | Yes | Yes |
| 55977 | paid | $5,750.00 | 2 | Yes | Yes |
| 56046 | paid | $3,500.00 | 1 | Yes | Yes |
| (no ref) | posted | $1,250.00 | 1 | Yes | No |

## Splitting Logic

For each unallocated bill line:
- **Lot 1 amount** = ROUND(original / 2, 2)
- **Lot 2 amount** = original - Lot 1 amount (remainder approach, guarantees exact sum)

Examples:
- $269.72 splits into $134.86 + $134.86
- $5,194.49 splits into $2,597.25 + $2,597.24
- $233.00 splits into $116.50 + $116.50

## Technical Steps

### Step 1: Split Bill Lines
A SQL migration will:
1. **Update** each existing unallocated bill line: set `lot_id` = Lot 1, `amount` = ROUND(amount/2, 2), `unit_cost` = ROUND(unit_cost/2, 2)
2. **Insert** a new bill line for Lot 2 with `amount` = original - Lot 1 amount, preserving cost_code, memo, and all other fields

### Step 2: Split Journal Entry Lines (bill post entries)
For each bill's journal entry (source_type = 'bill'):
- Split each **debit line** (the cost allocation) into two lines with lot_id
- Split the **credit line** (A/P) into two lines with lot_id
- Amounts use the same remainder approach to stay balanced

### Step 3: Split Journal Entry Lines (payment entries)
For paid bills, also split the payment journal entry lines the same way.

### Step 4: Verification
After the migration, verify:
- Every bill line in the project has a lot_id
- Every journal entry remains balanced (debits = credits)
- No bill's line sum exceeds its total_amount

## No Code Changes Required
The edge function and useBills.ts were already fixed in the previous update. This is purely a data correction.

