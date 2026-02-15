

## Restructure Companies into "Suppliers" with Sub-Navigation

### Problem

The current Companies tab uses horizontal tabs (Companies / Representatives) inside the content area, which creates layout inconsistencies compared to Cost Codes and Specifications. The horizontal tab bar pushes the search and table down, and the table border styling doesn't match.

### Solution

Split "Companies" into a **Suppliers** group in the sidebar with two separate sub-items: **Companies** and **Representatives**. Each becomes its own standalone tab content, matching the exact layout pattern of Cost Codes and Specifications.

### Reference Layout (Cost Codes)

```text
[Header row]
  Left: h3 "Cost Codes" + p subtitle
  Right: action buttons (Add Cost Code, etc.)

[Search bar]
  w-64, left-aligned

[Table]
  border rounded-lg, standard shadcn table
```

The outer container uses `space-y-4` (not `space-y-6`).

### Changes

**1. `src/pages/Settings.tsx` -- Sidebar Navigation**

- Rename the single "Companies" `TabsTrigger` to a **Suppliers** group label (non-clickable text heading) with two indented sub-items beneath it:
  - `TabsTrigger value="companies"` labeled "Companies"
  - `TabsTrigger value="representatives"` labeled "Representatives"
- Add a new `TabsContent value="representatives"` rendering a new `RepresentativesTab` component
- Keep the existing `TabsContent value="companies"` but point it to the refactored `CompaniesTab`
- Update the redirect in `src/pages/Companies.tsx` to still work (it already points to `?tab=companies`)

**2. `src/components/settings/CompaniesTab.tsx` -- Refactor to Standalone**

Remove all horizontal Tabs logic. Match the Cost Codes layout exactly:
- Outer div: `space-y-4`
- Header row: `flex justify-between items-center` with left-side title ("Companies" / "Manage your companies") and right-side "Add Company" button
- Search bar: `relative w-64` with Search icon and Input
- Table: `CompaniesTable` directly (no tabs wrapper)
- Remove Representatives-related state, imports, and components

**3. Create `src/components/settings/RepresentativesTab.tsx` -- New Standalone Tab**

Mirror the same layout as CompaniesTab/CostCodesTab:
- Outer div: `space-y-4`
- Header row: title "Representatives" / subtitle "Manage your company representatives" + "Add Representative" button
- Search bar: `relative w-64`
- Table: `RepresentativesTable` directly
- Include the `AddRepresentativeModal`

### Sidebar Visual Structure

```text
Company Profile
Employees
Suppliers          <-- non-clickable group label, text-xs uppercase text-muted-foreground
  Companies        <-- indented TabsTrigger
  Representatives  <-- indented TabsTrigger
Cost Codes
Specifications
Chart of Accounts
Budget
Dashboard
```

### Technical Details

- The "Suppliers" label will be a styled `div` (not a TabsTrigger), using `text-xs font-medium uppercase tracking-wider text-muted-foreground` with `mt-4 mb-1 px-3` for spacing
- The two sub-items will use `pl-6` for indentation to visually nest them under Suppliers
- Both Companies and Representatives tabs will use `space-y-4` (matching Cost Codes), not `space-y-6`
- The search input will use `w-64` (matching Cost Codes), not `flex-1 max-w-sm`

