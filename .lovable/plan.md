

## Fix Suppliers Label and Alphabetize Settings Sidebar

### Changes

**`src/pages/Settings.tsx` (lines 161-172)**

Two fixes:

1. **Suppliers label**: Change from all-caps (`uppercase`) to normal title case. Remove the `uppercase tracking-wider` classes and align it to the left like the other items (use `px-3` instead of centering). Keep it as a non-clickable group label but style it as normal text weight.

2. **Alphabetize all sidebar items**: Reorder the tabs alphabetically:
   - Budget
   - Chart of Accounts
   - Company Profile
   - Cost Codes
   - Dashboard
   - Employees
   - Specifications
   - Suppliers (group label)
     - Companies
     - Representatives

   Since "Suppliers" is a group with sub-items, it will be placed alphabetically among the other items (after Specifications). The final order:

   ```
   Budget
   Chart of Accounts
   Company Profile
   Cost Codes
   Dashboard
   Employees
   Specifications
   Suppliers
     Companies
     Representatives
   ```

### Technical Details

- Line 164: Change `className="text-xs font-medium uppercase tracking-wider text-muted-foreground mt-4 mb-1 px-3"` to `className="text-xs font-medium text-muted-foreground mt-4 mb-1 px-3"` (remove `uppercase tracking-wider`)
- Reorder the `TabsTrigger` elements and the Suppliers `div` into the alphabetical sequence shown above
- No changes to `TabsContent` order (order doesn't matter for content panels)
- Default tab value remains `company-profile` (unchanged)

