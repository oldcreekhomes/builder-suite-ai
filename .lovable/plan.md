
# Fix Grid Layout for Single-Lot Projects (Delete Button on Same Row)

## Issues Identified

### 1. Delete Button on Wrong Row
The current grid layout for single-lot projects has incorrect column spans that exceed the grid size, causing the delete button to wrap to a new line.

**Current single-lot layout (grid-cols-20):**
| Column | Span | Running Total |
|--------|------|---------------|
| Cost Code | 5 | 5 |
| Memo | 6 | 11 |
| Quantity | 2 | 13 |
| Cost | 2 | 15 |
| Total | 2 | 17 |
| Purchase Order | 3 | 20 |
| Action | 1 | **21** |

**Problem:** Total spans = 21, but grid only has 20 columns. The Action column wraps to a new row.

### 2. Data Confirmation
Your single-lot data IS being saved correctly with the lot ID. The fix we just implemented automatically assigns the single lot's ID when saving, even though the Address column isn't visible. This happens in the background during save.

## The Fix

Reduce the Memo column from `col-span-6` to `col-span-5` for single-lot projects so columns fit exactly in 20:

**Fixed single-lot layout (grid-cols-20):**
| Column | Old Span | New Span | Running Total |
|--------|----------|----------|---------------|
| Cost Code | 5 | 5 | 5 |
| Memo | 6 | **5** | 10 |
| Quantity | 2 | 2 | 12 |
| Cost | 2 | 2 | 14 |
| Total | 2 | 2 | 16 |
| Purchase Order | 3 | 3 | 19 |
| Action | 1 | 1 | **20** |

## Files to Change

**File:** `src/components/bills/ManualBillEntry.tsx`

### Job Cost Tab - Header (line 739)
Change Memo from `col-span-6` to `col-span-5` when addresses hidden

### Job Cost Tab - Rows (line 772)
Change Memo input container from `col-span-6` to `col-span-5` when addresses hidden

### Expense Tab - Header
Same change for Memo column in expense header

### Expense Tab - Rows
Same change for Memo input container in expense rows

## Result

The delete button will appear on the same row as all other columns for both single-lot and multi-lot projects.
