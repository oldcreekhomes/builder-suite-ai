Reuse the sidebar's project dropdown for the Multi-Deposit table's Project column so both stay in sync.

## Problem
`src/components/multi-entry/MultiDepositTable.tsx` builds its own `<Select>` with status groups. `src/components/sidebar/ProjectSelector.tsx` uses a Popover + Command (search box, status-group headings with color chips). Two implementations = drift.

## Approach
Extract the sidebar's inner picker into one shared component and have both call sites use it.

### 1. New shared component
`src/components/projects/ProjectPickerPopover.tsx`
- Controlled props: `value?: string`, `onSelect(project)`, `placeholder?`, `triggerClassName?`, `showEditButton?: boolean` (default false).
- Internally uses the same `useProjects`, `PROJECT_STATUS_GROUPS`, Popover + Command + status-grouped CommandItems with the exact colored heading chips and "Search projects…" input.
- Emits `onSelect(project)` — does not navigate. Only mounts `EditProjectDialog` when `showEditButton` is true.

### 2. Refactor `ProjectSelector.tsx` (sidebar)
Wrap `ProjectPickerPopover` with `showEditButton`, its own trigger label ("Select Project" + MapPin), and pass an `onSelect` that navigates to `/project/:id`. All routing/edit logic stays here; visual list moves into the shared component.

### 3. Update `MultiDepositTable.tsx`
Replace the `<Select>` in the Project cell with `<ProjectPickerPopover value={r.projectId} onSelect={(p) => handleProjectPick(r.id, p.id)} placeholder="Select project…" triggerClassName="h-9 w-full" />`. Remove the now-unused `orderedStatuses`/`groupedProjects` in this file (still available inside the shared component).

## Result
One source of truth for the project dropdown — search, status groups, colored badges, ordering. Any future change (new status, new sort, new field) updates every dropdown at once.

No behavior change to the sidebar; multi-entry rows get the same searchable, grouped picker.