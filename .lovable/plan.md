

## Service Area Tagging System

### Overview

Add a `service_areas` text array column to the `companies` table so each subcontractor/vendor can be tagged with the regions they serve (e.g., "Northern Virginia", "Outer Banks, NC"). Then, add a `region` text field to the `projects` table so each project is tagged with its area. When adding companies to bid packages, the list will be filtered to only show companies whose service areas include the project's region.

### How It Works for You

1. **Projects get a region tag** -- When creating/editing a project, you pick or type a region like "Northern Virginia" or "Outer Banks, NC".
2. **Companies get service area tags** -- When creating/editing a company, you add one or more service areas (same region names). Existing companies can be bulk-tagged.
3. **Bid package filtering is automatic** -- The "Add Companies to Bid Package" modal only shows companies whose service areas overlap with the project's region. A toggle lets you override and see all companies if needed.

No Google Maps API calls are needed. This is pure database filtering.

### Your Current Data

| Region | Projects | Companies |
|--------|----------|-----------|
| Northern Virginia / DC / MD | ~30 projects (Alexandria, Arlington, etc.) | ~56 companies (VA, MD, DC) |
| Outer Banks, NC | 1 project (Nags Head) | ~27 companies (NC) |

### Database Changes

**1. Add `service_areas` column to `companies` table:**

```sql
ALTER TABLE companies ADD COLUMN service_areas text[] DEFAULT '{}';
```

**2. Add `region` column to `projects` table:**

```sql
ALTER TABLE projects ADD COLUMN region text;
```

**3. Auto-populate existing data based on state:**

```sql
-- Tag VA/MD/DC companies as "Northern Virginia"
UPDATE companies
SET service_areas = ARRAY['Northern Virginia']
WHERE state IN ('VA', 'MD', 'DC') AND archived_at IS NULL;

-- Tag NC companies as "Outer Banks, NC"
UPDATE companies
SET service_areas = ARRAY['Outer Banks, NC']
WHERE state = 'NC' AND archived_at IS NULL;

-- Tag projects by address
UPDATE projects
SET region = 'Northern Virginia'
WHERE address ILIKE '%VA%' OR address ILIKE '%Arlington%' OR address ILIKE '%Alexandria%' OR address ILIKE '%McLean%' OR address ILIKE '%Falls Church%';

UPDATE projects
SET region = 'Outer Banks, NC'
WHERE address ILIKE '%NC%' OR address ILIKE '%Nags Head%';
```

### Code Changes

**File: `src/components/companies/AddCompanyDialog.tsx`**
- Add a "Service Areas" multi-tag input (similar to cost codes) on the Company Info tab.
- Use a predefined list of regions derived from existing project regions, plus allow custom entries.

**File: `src/components/companies/EditCompanyDialog.tsx`**
- Add the same Service Areas field for editing existing companies.

**File: `src/components/bidding/AddCompaniesToBidPackageModal.tsx`**
- Look up the project's `region` field.
- Filter the `company_cost_codes` query results to only include companies whose `service_areas` array contains the project's region.
- Add a small "Show all companies" toggle/checkbox that removes the filter when checked.

**File: `src/pages/ProjectDetails.tsx` (or project creation/edit form)**
- Add a "Region" dropdown/input field to project settings.

**File: `src/components/companies/CompaniesTable.tsx`**
- Display service areas as badges in the table (optional, low priority).

### What You'll See

- When you open a bid package for the Nags Head project and click "Add Companies," you'll only see your NC subs -- not the 50+ Virginia ones.
- When you open a bid package for an Arlington project, you'll only see your VA/MD/DC subs.
- A "Show all" toggle is available if you ever need to cross-assign.

