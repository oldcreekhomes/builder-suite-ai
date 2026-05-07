# Schedule Resource Picker — Company Search & Notification Filter

Improve the Resources dropdown in the Schedule (the "Select…" picker that opens "Internal Users / Company Representatives") so users can filter reps by company and only see reps that should receive schedule notifications.

## Changes

### 1. `src/hooks/useProjectResources.ts`
- Pull `company_id` and `receive_schedule_notifications` along with the existing rep fields.
- Filter out reps where `receive_schedule_notifications !== true`.
- Fetch the parent companies (`companies.id, company_name`) for the owned company IDs and attach `companyName` to each rep resource.
- Extend the `ProjectResource` type with optional `companyId` and `companyName` (only set for `External` reps).

### 2. `src/components/schedule/ResourcesSelector.tsx`
- Add a second filter control above the "Company Representatives" group: a company combobox/select populated from the unique company names found in the loaded reps. Default = "All companies".
- The existing `CommandInput` keeps doing free-text search across both groups (name + company).
- Apply the company filter only to the External (representatives) list. Internal Users list is unaffected.
- When a company is selected, the heading shows e.g. `Company Representatives — Acme Plumbing`.
- Reset the company filter when the popover closes.
- Reps that don't receive schedule notifications no longer appear at all (already excluded by the hook).

### 3. Make the rep label include the company
- In the dropdown rows, show `{rep name} · {company}` so users can disambiguate when search is across all companies. Selected/stored value stays as the rep name (current behavior, no schema change).

## Out of scope
- No DB schema changes.
- No changes to how resources are saved on tasks (still comma-separated names).
- Internal Users behavior unchanged.

## QA
- Open Resources picker on a schedule task.
- Verify only reps with `receive_schedule_notifications = true` appear.
- Type a company name in the new company filter → only that company's reps remain.
- Clear filter → all eligible reps return.
- Free-text search still matches across users and reps.
- Selecting/removing a rep still saves correctly to the task.
