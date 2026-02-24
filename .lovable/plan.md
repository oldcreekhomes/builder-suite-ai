

## Move Service Areas to a Dropdown Next to Company Type

### What Changes

The "Service Areas" field will be moved from the bottom of the Company Information tab to sit **right next to "Company Type"** in the same row. It will change from the current free-text multi-tag input to a **simple multi-select dropdown** with two predefined options:

- Washington, DC
- Outer Banks, NC

This applies to both the **Edit Company** and **Add Company** dialogs.

### Layout (Before vs After)

**Before:**
```text
| Company Name          | Company Type     |
| [Address fields...]                      |
| Phone Number          | Website          |
| Associated Cost Codes                    |
| Service Areas (free-text tag input)      |
```

**After:**
```text
| Company Name          | Company Type     | Service Area     |
| [Address fields...]                                        |
| Phone Number          | Website                             |
| Associated Cost Codes                                      |
```

The top row changes from a 2-column grid to a **3-column grid** to fit Company Name, Company Type, and Service Area side by side.

### Technical Details

**Files to modify:**

1. **`src/components/companies/EditCompanyDialog.tsx`**
   - Change the top `grid grid-cols-2` (line 451) to `grid grid-cols-3`
   - Add a Service Area dropdown (using existing Select component) right after Company Type, inside that same grid row
   - Remove the standalone "Service Areas" section at the bottom (lines 574-583)
   - The dropdown will allow multiple selections displayed as badges, with "Washington, DC" and "Outer Banks, NC" as options

2. **`src/components/companies/AddCompanyDialog.tsx`**
   - Same changes: move Service Area into the top row as a 3rd column dropdown
   - Remove the standalone section at the bottom

3. **`src/components/companies/ServiceAreaSelector.tsx`**
   - Rewrite to be a simple multi-select dropdown with the two predefined regions instead of the current free-text tag input
   - Keep the same props interface (`selectedAreas`, `onAreasChange`) so no other code changes are needed

### Data Mapping

The existing database values "Northern Virginia" will be mapped to "Washington, DC" in the migration to match the new naming. A small SQL update will handle this:
```sql
UPDATE companies 
SET service_areas = array_replace(service_areas, 'Northern Virginia', 'Washington, DC');

UPDATE projects 
SET region = 'Washington, DC' 
WHERE region = 'Northern Virginia';
```

