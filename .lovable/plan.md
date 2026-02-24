

## Fix Companies Table Column Widths

### Problem
When the full company list is displayed (no search), the browser's auto table layout engine compresses columns based on content, causing "Cost Codes" to wrap and the overall layout to look squeezed. When searching (fewer rows), the layout looks perfect because there's less content competing for space.

### Solution
Add explicit width classes to both `TableHead` and `TableCell` elements in `CompaniesTable.tsx` to lock the column proportions regardless of row count. This follows the project's established pattern (per the html-table-sizing-rules-body-sync standard).

### File to Modify

**`src/components/companies/CompaniesTable.tsx`**

Update the table header and body cells with synchronized width classes:

| Column | Width | Notes |
|--------|-------|-------|
| Company Name | (no width, flex fill) | Takes remaining space |
| Type | `w-28` | Badge fits comfortably |
| Address | (no width, flex fill) | Takes remaining space |
| Cost Codes | `w-24` | Short content, prevent header wrap |
| Website | `w-24` | Short content |
| Representatives | `w-32` | Icon + count |
| Actions | `w-16 text-center` | 3-dot menu only |

Add `whitespace-nowrap` to the Cost Codes and Representatives headers to prevent text wrapping. Apply matching width classes on the corresponding `TableCell` elements so the browser respects the sizing consistently.

