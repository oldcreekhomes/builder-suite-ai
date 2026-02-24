

## Add Tooltips to Truncated Company Name and Address

### Problem
When Company Name or Address text is truncated with ellipsis, there's no way to see the full text.

### Solution
Wrap the truncated Company Name and Address cells in `Tooltip` components (already imported) so hovering reveals the full text.

### Changes to `src/components/companies/CompaniesTable.tsx`

1. **Company Name cell**: Wrap the text in a `Tooltip` that shows the full `company.company_name` on hover
2. **Address cell**: Wrap the address text in a `Tooltip` that shows the full address on hover

Both will use the existing `Tooltip`/`TooltipTrigger`/`TooltipContent` components already imported in the file.

