## Active Jobs Table — Replace Status Grouping with Tabs

Revert the section-header grouping and instead use **tabs** at the top of the Active Jobs card to filter by status.

### Changes to `src/components/owner-dashboard/ActiveJobsTable.tsx`

**1. Add tabs above the table**

Use shadcn `Tabs` component with these tabs (in order):
- `All (n)`
- `Under Construction (n)`
- `Permitting (n)`
- `In Design (n)`

Counts come from `activeProjects` filtered by status. Default tab: `Under Construction` (most actionable). Selected tab is local state.

**2. Filter rows by selected tab**

- `All` → show every active project, sorted by status priority then `display_order`.
- Specific status tab → show only that status, sorted by `display_order`.

**3. Remove the section header rows and grouping logic**

No more `STATUS_GROUPS` rendering with group headers. Plain flat rows under one set of column headers.

**4. Bring back the Status column only on the `All` tab**

When `All` is selected, show a `Status` column with the colored badge (so the user can still see which group each row belongs to). When a specific status tab is selected, hide the Status column (it's redundant).

**5. Keep "Bills" merged column**

Single centered `Bills` column showing `{review} / {pay}`, or `—` if both zero. (Unchanged from current.)

**6. Reorder mode**

- Drag-and-drop only enabled inside specific status tabs (not on `All`), to keep ordering scoped to one group.
- When `All` is active and Reorder is toggled on, show a small note: "Switch to a status tab to reorder."

### Resulting columns

- **All tab:** `Address | Status | Manager | Schedule Progress | Bills | Schedule Update`
- **Status-specific tab:** `Address | Manager | Schedule Progress | Bills | Schedule Update`
- (+ drag handle column when Reorder is on inside a status tab)

### Technical notes

- shadcn `Tabs`, `TabsList`, `TabsTrigger` already used elsewhere in the codebase.
- No data-fetching or hook changes.
- Tab state is local; no persistence needed.
