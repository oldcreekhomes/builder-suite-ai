

## Fix: Service Areas Not Displaying in Edit Company Dialog

### Root Cause (Two Issues Found)

**Issue 1: Patriot Development has no service areas saved**
Database query confirms `service_areas: []` (empty array) for Patriot Development. The data simply isn't there.

**Issue 2: Mismatched service area values**
The database contains `"Northern Virginia"` for many companies, but the `ServiceAreaSelector` component only recognizes `"Washington, DC"` and `"Outer Banks, NC"`. When the options were renamed from "Northern Virginia" to "Washington, DC", existing database records were never migrated. This means:
- Companies tagged with `"Northern Virginia"` will never show the checkbox checked
- If a user re-saves, the old value gets replaced with the new label

### Solution

**Step 1: Migrate existing database values**
Run a SQL migration to update all `service_areas` entries from `"Northern Virginia"` to `"Washington, DC"`:

```sql
UPDATE companies
SET service_areas = array_replace(service_areas, 'Northern Virginia', 'Washington, DC')
WHERE 'Northern Virginia' = ANY(service_areas);
```

**Step 2: No code changes needed**
The `EditCompanyDialog` initialization logic (line 283) and save logic (line 376) are both correct. Once the DB values match the UI options, checkboxes will display correctly.

### Files Changed
- **Database migration only** -- no code file changes needed

### Verification
After the migration, opening any company that previously had "Northern Virginia" should now show "Washington, DC" checked in the Service Area selector.

For Patriot Development specifically, you'll need to manually set their service area by editing the company and checking "Washington, DC", since they currently have an empty array.
