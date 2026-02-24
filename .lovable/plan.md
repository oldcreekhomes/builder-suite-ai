

## Fix Service Area Field in Settings Representatives

### Problem
The Service Area field in the Settings representative dialogs (Edit and Add) currently shows as bare checkboxes at the top of the form. It should use the same dropdown/popover style as the Company dialogs (`ServiceAreaSelector` component) and sit in the same row as the Company field.

### Changes

#### 1. Edit Representative Dialog (`src/components/representatives/EditRepresentativeDialog.tsx`)
- Remove the standalone `service_areas` checkbox block at the top of the General tab (lines 240-267)
- Put Company and Service Area side-by-side in a `grid grid-cols-2 gap-4` row
- Replace the checkboxes with the existing `ServiceAreaSelector` component (popover with badges, same as company forms)
- Wire `ServiceAreaSelector` to `form.setValue('service_areas', ...)` and `form.watch('service_areas')`

#### 2. Add Representative Modal (`src/components/representatives/AddRepresentativeModal.tsx`)
- Remove the separated "Service Areas" section with checkboxes near the bottom (lines 322-352)
- Put Company and Service Area side-by-side in a `grid grid-cols-2 gap-4` row
- Replace with `ServiceAreaSelector` component, keeping the existing auto-populate logic (when a company is selected, its service areas are pre-filled)

### Layout (both dialogs)

```text
| Company (searchable)    | Service Area (dropdown) |
```

Both fields in one row, matching the company dialog pattern.

### Technical Details
- Reuse `ServiceAreaSelector` from `src/components/companies/ServiceAreaSelector.tsx` -- no new components needed
- The `ServiceAreaSelector` is a controlled component accepting `selectedAreas` and `onAreasChange` props
- Connect it to the form via `form.watch('service_areas')` for reading and `form.setValue('service_areas', areas)` for writing
- Validation (`min(1)`) stays in the zod schema -- form-level error will still display via `FormMessage`
