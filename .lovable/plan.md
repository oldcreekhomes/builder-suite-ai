
# Fix Grid Layout Whitespace in Manual Bill Entry

## The Problem

The columns in the multi-lot grid don't add up to the full 25 columns, leaving whitespace to the right of the Action button.

**Current multi-lot layout (grid-cols-25):**
| Column | Span | Running Total |
|--------|------|---------------|
| Cost Code | 4 | 4 |
| Memo | 4 | 8 |
| Quantity | 2 | 10 |
| Cost | 2 | 12 |
| Total | 2 | 14 |
| Address | 3 | 17 |
| Purchase Order | 4 | 21 |
| Split | 1 | 22 |
| Action | 1 | 23 |

**Missing: 2 columns** - This is causing the whitespace.

## The Fix

Increase Cost Code and Memo columns equally to fill the gap:

| Column | Old Span | New Span |
|--------|----------|----------|
| Cost Code | 4 | **5** |
| Memo | 4 | **5** |
| (all others stay the same) | | |

**New total: 5 + 5 + 2 + 2 + 2 + 3 + 4 + 1 + 1 = 25** ✓

## Changes Required

**File:** `src/components/bills/ManualBillEntry.tsx`

### Job Cost Tab - Header (around line 734-742)
- Change Cost Code from `col-span-4` to `col-span-5`
- Change Memo from `col-span-4` to `col-span-5`

### Job Cost Tab - Rows (around line 750, 768)
- Change Cost Code input from `col-span-4` to `col-span-5`
- Change Memo input from `col-span-4` to `col-span-5`

### Expense Tab - Header (around line 937-945)
- Change Account from `col-span-4` to `col-span-5`
- Change Memo from `col-span-4` to `col-span-5`

### Expense Tab - Rows (around line 953, 965)
- Change Account input from `col-span-4` to `col-span-5`
- Change Memo input from `col-span-4` to `col-span-5`

## Result

The grid will now fill 100% of the available width with no whitespace to the right of the delete button.
