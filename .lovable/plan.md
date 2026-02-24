

## Add Service Areas to Company Representatives

### Summary

Add a `service_areas` text array column to `company_representatives`, backfill it from the parent company's service areas, and update all representative Add/Edit forms and tables to display and manage this field. This is purely additive -- no notification logic changes.

### 1. Database Migration

Add the column and backfill existing representatives with their parent company's service areas:

```sql
ALTER TABLE company_representatives
  ADD COLUMN service_areas text[] NOT NULL DEFAULT '{}'::text[];

UPDATE company_representatives cr
SET service_areas = COALESCE(c.service_areas, ARRAY['Washington, DC']::text[])
FROM companies c
WHERE cr.company_id = c.id;
```

### 2. Settings > Representatives Table (`src/components/representatives/RepresentativesTable.tsx`)

- Add `service_areas` to the query select
- Add a "Service Area" column between "Company" and "Type"
- Display service area values as badges (same styling pattern used for company service areas)
- Update the Representative interface to include `service_areas?: string[]`

### 3. Settings > Add Representative Modal (`src/components/representatives/AddRepresentativeModal.tsx`)

- Add `service_areas` to the zod schema as `z.array(z.string()).min(1, "At least one service area is required")`
- Add a "Service Area" section with checkboxes for "Washington, DC" and "Outer Banks, NC" (from `SERVICE_AREA_OPTIONS`)
- When a company is selected, auto-populate from the selected company's service areas by fetching `service_areas` in the companies dropdown query
- Include `service_areas` in the insert payload

### 4. Settings > Edit Representative Dialog (`src/components/representatives/EditRepresentativeDialog.tsx`)

- Add `service_areas` to the zod schema
- Initialize from `representative.service_areas` in the useEffect reset
- Add service area checkboxes to the "General" tab
- Include in the update payload

### 5. Company View > Add Representative Dialog (`src/components/companies/AddRepresentativeDialog.tsx`)

- Add `service_areas` to the schema and form
- Default checkboxes from the parent company's service areas (fetch via `companyId` prop)
- Include in the insert payload

### 6. Company View > Edit Representative Dialog (`src/components/companies/EditRepresentativeDialog.tsx`)

- Add `service_areas` to the schema, form reset, and update payload
- Add checkboxes to the "General" tab

### 7. Company View Dialog (`src/components/companies/ViewCompanyDialog.tsx`)

- Add `service_areas` to the representatives query select
- Display service area badges next to each representative's name/title

### Files to modify

```text
Database: new migration (add service_areas column + backfill)

src/components/representatives/RepresentativesTable.tsx
src/components/representatives/AddRepresentativeModal.tsx
src/components/representatives/EditRepresentativeDialog.tsx
src/components/companies/AddRepresentativeDialog.tsx
src/components/companies/EditRepresentativeDialog.tsx
src/components/companies/ViewCompanyDialog.tsx
```

### What stays the same

- All notification logic (bid, schedule, PO) -- unchanged, still uses boolean flags
- Company-level service areas -- untouched
- The `src/lib/serviceArea.ts` utility -- reused for canonical options
- Bidding module -- no changes needed for this step

