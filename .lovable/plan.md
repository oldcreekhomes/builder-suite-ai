

## Fix Cost Code Display in "Enter with AI" Tab

### Problem

The "Enter with AI" tab (BatchBillReviewTable) shows "3 items" for bills with multiple cost codes, instead of showing the first cost code name followed by "+2" with a hover tooltip showing the allocation breakdown. This is inconsistent with the Approval tab (BillsApprovalTable), which correctly shows "+3" with a detailed tooltip.

### Solution

Update the cost code display logic in `BatchBillReviewTable.tsx` to match the pattern used in `BillsApprovalTable.tsx`:

**File: `src/components/bills/BatchBillReviewTable.tsx`**

1. **Change the `accountDisplay` calculation (lines 601-630)**: Instead of returning `"N items"`, return a structured object with:
   - `display`: First cost code name + `" +N"` for multiple, or just the name for single
   - `breakdown`: Array of cost code names with their amounts
   - `total`: Sum of all line amounts
   - `count`: Number of unique cost codes

2. **Update the Cost Code cell rendering (lines 728-744)**: Replace the simple text tooltip with the same rich tooltip used in BillsApprovalTable -- showing each cost code with its allocated amount, plus a total row at the bottom.

### Display Format

- **Single cost code**: Show the cost code name (e.g., "4470: Siding")
- **Multiple cost codes**: Show first cost code + count (e.g., "4370: Framing Labor +2")
- **Hover tooltip for multiple**: Show each cost code with its amount, plus a total line

### Technical Details

The `accountDisplay` variable (currently a string) will become an object:

```text
{
  display: "4370: Framing Labor +2",   // or just "4470: Siding" for single
  breakdown: [
    { name: "4370: Framing Labor", amount: 1032 },
    { name: "4470: Siding", amount: 3500 },
    { name: "4310: Framing Material", amount: 720 }
  ],
  total: 5252,
  count: 3
}
```

The tooltip will render each breakdown entry with amounts, matching the BillsApprovalTable format with cost code name on one line and amount aligned to the right, plus a border-separated total row.

### Files Changed

| File | Change |
|------|--------|
| `src/components/bills/BatchBillReviewTable.tsx` | Update accountDisplay to show first code + "+N" with rich allocation tooltip |

