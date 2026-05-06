## Active Jobs Table — Reduce Visual Noise

Two changes to `src/components/owner-dashboard/ActiveJobsTable.tsx`:

### 1. Group rows by Status (remove Status column)

- Remove the `Status` `<TableHead>` and the per-row Status `<TableCell>` (badge).
- Group `sortedProjects` into three sections by status, in this order:
  1. Under Construction
  2. Permitting
  3. In Design
- Render each group as a section header row spanning all columns:
  - Style: muted background (`bg-muted/50`), small uppercase label, e.g. `Under Construction (5)`.
  - Use the existing `statusColors` accent as a left border or small dot for visual continuity.
- Sort within each group keeps current behavior (display_order when reorder mode on, otherwise default).
- Reorder/drag-and-drop: keep working, but constrain drops to within the same status group (a project can't be reordered across groups since group is derived from status). Cross-group drag attempts are ignored.

### 2. Merge Review + Pay into one "Bills" column

- Replace the two `Review` and `Pay` `<TableHead>` cells with a single centered `Bills` header.
- Cell renders as `{review} / {pay}` where:
  - `review = (bills?.currentCount || 0) + (bills?.lateCount || 0)`
  - `pay = bills?.payCount || 0`
- If both are 0, show `—`.
- If only one side is non-zero, still show full `n / n` format (e.g. `0 / 3`) so the column reads consistently.
- Small badge styling: keep numbers in a single muted pill, no separate badges.

### Resulting columns

`Address | Manager | Schedule Progress | Bills | Schedule Update`
(plus drag handle column when Reorder is on)

### Technical notes

- `colSpan` for the empty-state row updates to 5 (or 6 with reorder column).
- Group header row uses `colSpan={isReorderEnabled ? 6 : 5}`.
- No data-fetching changes; `useProjects`, `useBillCountsByProject`, `useProjectScheduleProgress` stay as-is.
- No DB or hook changes.
