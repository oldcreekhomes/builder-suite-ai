## UI updates to Project Notifications matrix

File: `src/components/projects/ProjectNotificationsMatrix.tsx`

1. **Center column headers and cells** — add `text-center` to the "User" header alignment stays left, but Bid / PO / Schedule / Bid Submitted / Accounting Reports header cells get centered (already `text-center`); ensure the checkbox+star cell content is centered (already uses `flex justify-center`). Center the header labels above the checkbox column by aligning them over the checkbox (not the checkbox+star pair) — wrap header label in a container matching the cell's checkbox position.

2. **Remove role subtitle** — delete the `{u.role && <div>…capitalize…</div>}` line under each user name so only the name shows.

3. **Sort users alphabetically by first name** — sort the `users` array by `first_name` (case-insensitive, fallback to email) before rendering.

4. **Consolidate helper text** — remove the bottom paragraph ("Primary contact appears as the sender…"). Merge its content into the top description under the "Project Notifications" heading so there is a single explanation:

   > Check the users who should receive each type of notification, then click the star to mark the primary contact (shown as the sender on outgoing emails). Other checked users are CC'd. If no primary is set, the project owner is used.

No database or logic changes.
