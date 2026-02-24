

## Fix Companies Table: Match Search Layout to Full List

### Problem
With 2 rows (search results), the browser has plenty of space and the columns look perfect. With 150+ rows, long company names wrap onto multiple lines, pushing the right-side columns off-screen. The columns need to be locked so the layout is identical regardless of row count.

### Solution
Use `table-fixed` layout on the table and assign explicit percentage-based widths to the Company Name and Address columns. Add truncation so long text gets cut off with ellipsis instead of wrapping.

### Changes to `src/components/companies/CompaniesTable.tsx`

1. Add `table-fixed` class to the Table component
2. Set Company Name column to a fixed width (e.g., `w-[25%]`) with truncation
3. Set Address column to use remaining space with truncation
4. Ensure all `TableCell` elements have matching `truncate` and `max-w-0` so text clips cleanly

### Column Layout

| Column | Width | Truncation |
|--------|-------|------------|
| Company Name | `w-[25%]` | Yes -- truncate with ellipsis |
| Type | `w-28` | No |
| Address | auto (remaining) | Yes -- truncate with ellipsis |
| Cost Codes | `w-24` | No |
| Website | `w-24` | No |
| Representatives | `w-32` | No |
| Actions | `w-16` | No |

### Technical Detail
- Adding `className="table-fixed"` to `<Table>` forces the browser to respect header widths exactly
- `max-w-0 truncate` on Company Name and Address cells ensures text is clipped with "..." instead of wrapping to multiple lines
- This makes the full list render identically to the search results view

