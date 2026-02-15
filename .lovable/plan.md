

## Fix Table Styling Consistency and Suppliers Sidebar

### Problem 1: Table Border Breaking
The Companies and Representatives tables use `border rounded-lg` but are missing `overflow-hidden`. This causes the sticky table header to break through the rounded border at the top.

### Problem 2: Column Header Font Mismatch
The Companies and Representatives tables apply custom `h-8 px-2 py-1 text-xs font-medium` to every `TableHead`, overriding the default shadcn styling. The Cost Codes table uses the default `TableHead` classes (no overrides), which is the correct standard.

### Problem 3: Suppliers Sidebar Label
The "Suppliers" label uses `text-xs` (smaller than the `text-sm` used by all other sidebar items) and is a static, non-interactive div. It needs to become a same-size collapsible item.

---

### Changes

**1. `src/components/companies/CompaniesTable.tsx`**
- Change `<div className="border rounded-lg">` to `<div className="border rounded-lg overflow-hidden">`
- Remove all custom `h-8 px-2 py-1 text-xs font-medium` overrides from `TableHead` elements so they use the default shadcn styling (matching Cost Codes)

**2. `src/components/representatives/RepresentativesTable.tsx`**
- Change `<div className="border rounded-lg">` to `<div className="border rounded-lg overflow-hidden">`
- Remove all custom `h-8 px-2 py-1 text-xs font-medium` overrides from `TableHead` elements so they use the default shadcn styling (matching Cost Codes)

**3. `src/pages/Settings.tsx`**
- Replace the static "Suppliers" `div` label with a collapsible section using `Collapsible` from Radix UI
- The trigger will be styled as `text-sm` (same font size as all other sidebar items) with a chevron icon that rotates on open/close
- Companies and Representatives will be nested inside the collapsible content, indented with `pl-6`
- The collapsible will default to open when either "companies" or "representatives" is the active tab

