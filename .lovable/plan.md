
# Remove Redundant Type Column from Marketplace Table

## Problem

The "Type" column in the table is redundant information:
- The left sidebar already shows which type is selected
- Every row in the filtered view shows the same type (e.g., all "Pool/Spa Contractor")
- This wastes valuable horizontal space

## Solution

Remove the Type column entirely from the table, reducing from 6 columns to 5:

| Current Layout (6 cols) | New Layout (5 cols) |
|------------------------|---------------------|
| Company Name           | Company Name        |
| **Type**               | **REMOVED**         |
| Location               | Location            |
| Rating                 | Rating              |
| Phone                  | Phone               |
| Website                | Website             |

## File to Modify

`src/components/marketplace/MarketplaceCompaniesTable.tsx`

## Changes

1. **Remove Type header** (line 113)
2. **Remove Type cell with Badge** (lines 126-130)
3. **Update colSpan** for empty state from 6 to 5 (line 184)
4. **Remove unused imports**: `Badge` component and `getCompanyTypeColor` function

## Result

- Cleaner, less cluttered table
- More horizontal space for other columns (Location can show more of the address)
- No duplicate information between sidebar and table
