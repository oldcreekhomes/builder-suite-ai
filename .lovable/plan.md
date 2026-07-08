## Mirror Edit Project fields in Create New Project

Rebuild the Project Information tab of `src/components/NewProjectDialog.tsx` so the layout, fields, and order match `EditProjectDialog.tsx` exactly.

### Fields (replacing current set)
Row 1 (8-col grid): **Address** (5 cols) · **Region** (3 cols, dropdown: No Region + SERVICE_AREA_OPTIONS)
Row 2 (3-col grid): **Construction Manager** · **Accounting Manager** · **Apartments** (No/Yes)
Row 3 (2-col grid): **Status** (In Design / Permitting / Under Construction / Completed) · **Accounting Software** (QuickBooks / Builder Suite / Other)
Row 4: **Lots / Addresses** section (see below)

Remove the standalone "Total Lots" number input — lot count is derived from the Lots section, matching Edit.

### Lots / Addresses at create time
Since the project doesn't exist yet, add a new `src/components/projects/LocalLotManagementSection.tsx` that mirrors `LotManagementSection`'s UI (Add Lot button, inline table with edit/delete, auto-incrementing lot numbers, inline name editing) but holds lots in local React state — no Supabase reads, no delete-warning query.
- Props: `lots: LocalLot[]`, `onChange(lots)`.
- `LocalLot = { tempId: string; lot_number: number; lot_name?: string }`.
- Simpler delete confirmation (just "Are you sure?" since nothing else references the lot yet).

On successful `projects.insert()`, insert all local lots into `project_lots` in one call (`project_id`, `lot_number`, `lot_name`) before saving notification recipients.

### Validation
- Required: address, status, construction_manager, accounting_manager.
- `total_lots` on `projects.insert()` is set to `lots.length` (defaults to 0 if none added), preserving the existing column.
- Notifications tab requirement (primary star on all 5 channels) stays.

### Dialog chrome
- Keep the two-tab structure: **Project Information** | **Notifications**.
- Dialog stays `sm:max-w-[900px]`.
- Cancel / Create Project footer unchanged.

No database or edge-function changes.