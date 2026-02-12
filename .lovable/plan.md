
# Fix PO Currency Display and Match Edit Bill Grid to Manual Entry

## Two Issues to Fix

### 1. Show Cents in PO Dialogs and Dropdowns

Both `POSelectionDropdown.tsx` and `PODetailsDialog.tsx` use `formatCurrency` with `minimumFractionDigits: 0, maximumFractionDigits: 0`, which hides cents. Change both to use `minimumFractionDigits: 2, maximumFractionDigits: 2` so values like `$8,427.00` and `$-240.50` display correctly.

### 2. Match Edit Bill Grid Layout to Manual Entry

The Edit Bill dialog currently uses `grid-cols-28` (multi-lot) / `grid-cols-24` (single-lot) with oversized column spans, creating excess whitespace. Switch to match the Manual Bill Entry exactly:

**Single-lot (no Address column): `grid-cols-20`**
| Cost Code (5) | Memo (5) | Quantity (2) | Cost (2) | Total (2) | Purchase Order (3) | Action (1) |

**Multi-lot (with Address column): `grid-cols-25`**
| Cost Code (5) | Memo (5) | Quantity (2) | Cost (2) | Total (2) | Address (3) | Purchase Order (4) | Split (1) | Action (1) |

Note: The Edit Bill dialog does not have a Split column, so for multi-lot we use:
| Cost Code (5) | Memo (5) | Quantity (2) | Cost (2) | Total (2) | Address (3) | Purchase Order (4) | Action (1) | = 24

Adjusted to match manual entry proportions as closely as possible:
- Multi-lot: `grid-cols-24` with spans 5, 5, 2, 2, 2, 3, 4, 1
- Single-lot: `grid-cols-20` with spans 5, 5, 2, 2, 2, 3, 1

## Files to Edit

| File | Change |
|---|---|
| `src/components/bills/PODetailsDialog.tsx` | Change `formatCurrency` to show 2 decimal places |
| `src/components/bills/POSelectionDropdown.tsx` | Change `formatCurrency` to show 2 decimal places |
| `src/components/bills/EditBillDialog.tsx` | Update grid from `grid-cols-28/24` to `grid-cols-24/20`, adjust all column spans to match manual entry proportions, update both header and row grids for Job Cost tab |

## Technical Details

In `EditBillDialog.tsx`, the specific span changes for the Job Cost grid:

**Header and rows (single-lot, currently `grid-cols-24`):**
- Change to `grid-cols-20`
- Cost Code: 4 -> 5
- Memo: 7 -> 5
- Quantity: 2 (same)
- Cost: 2 (same)
- Total: 2 (same)
- Purchase Order: 4 -> 3
- Action: 1 (same)

**Header and rows (multi-lot, currently `grid-cols-28`):**
- Change to `grid-cols-24`
- Cost Code: 4 -> 5
- Memo: 5 (same)
- Quantity: 2 (same)
- Cost: 2 (same)
- Total: 2 (same)
- Address: 4 -> 3
- Purchase Order: 4 (same)
- Action: 1 (same)

The Job Cost Total footer row also needs its grid updated to match the new column totals.
