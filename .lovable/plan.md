

## Fix: Service Areas Not Loading in Edit Company Dialog

### Root Cause
The companies fetch query in `CompaniesTable.tsx` (line 75-91) does NOT include `service_areas` in its SELECT clause. This means when a company is passed to the `EditCompanyDialog`, the `service_areas` field is `undefined`, so the checkboxes never get pre-checked -- even though the data exists in the database.

### Solution
Add `service_areas` to the SELECT query in `CompaniesTable.tsx`.

### File to Modify

**`src/components/companies/CompaniesTable.tsx`** (line ~91)

Add `service_areas` to the `.select()` call, right after `insurance_required`:

```
insurance_required,
service_areas,
archived_at
```

That single line addition will make the service areas data available to the Edit Company dialog, which already has the initialization logic at line 283:

```ts
if (company.service_areas && company.service_areas.length > 0) {
  setSelectedServiceAreas([...company.service_areas]);
}
```

### Additional Note
The database currently shows `service_areas: []` (empty array) for "Kat & Mat Electrical Services". If service areas were previously set via the dialog but didn't persist, that would be a separate save issue. However, the immediate fix is ensuring the field is fetched so that any saved values actually display. Once this fix is in place, you can set the service areas in the Edit dialog and they should persist and show on the next open.
