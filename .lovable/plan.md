

## Issues Found

### 1. Contact shows "Project Manager" instead of actual contact info
**Root cause**: In `SendTestEmailModal.tsx` (line 202) and `SendBidPackageModal.tsx` (line 153), the fallback is `'Project Manager'`. The manager lookup uses `users.find(user => user.id === projectData.construction_manager)` — if the `construction_manager` field on the project doesn't match any user ID from `useCompanyUsers()`, it falls back to the generic text. This likely means the `construction_manager` field is not set on this project, or the user record lacks `phone_number`/`email`.

**Fix**: Query the `users` table directly using `projectData.construction_manager` ID rather than relying on the `useCompanyUsers()` hook (which only returns company employees). If no manager is assigned, show "Not assigned" instead of "Project Manager" to make the issue obvious.

### 2. "Scope of Work" label wraps to 2 lines
**Root cause**: In the email HTML (edge function line 303), `Scope of Work:` uses a nested table layout with `width: 120px` for the label column — same as all other labels. But "Scope of Work:" is wider than "Contact:" or "Cost Code:", causing it to wrap at 120px.

**Fix**: Increase the label column `width` from `120px` to `140px` for ALL label fields in the email template (lines 277, 283, 289, 295, 303, 311) so "Scope of Work:" fits on one line and all labels remain aligned.

### 3. Scope of Work description not aligned with other values
**Root cause**: The Scope of Work row uses a nested `<table>` layout (lines 301-306) while all other rows use `<span>` with `display: inline-block; width: 120px`. This structural difference causes the value text to start at a different horizontal position.

**Fix**: Along with the width change above, ensure the nested table's label `<td>` width matches the updated label width (140px) so the value column aligns with all other rows.

### 4. File link returns 404 "Object not found"
**Root cause**: Two types of files get stored in `project_bid_packages.files`:
- **Bidding uploads**: `bidding_{id}_{ts}_{name}` — stored under `specifications/` folder in the `project-files` bucket
- **Linked project files**: `{projectId}/{uuid}_{name}` — stored at root of the `project-files` bucket (no `specifications/` prefix)

The edge function (`generateFileDownloadLinks`, line 199) **always** prepends `specifications/` to the path. For linked project files this creates a wrong URL (e.g., `project-files/specifications/691271e6.../file.pdf` instead of `project-files/691271e6.../file.pdf`).

**Fix**: In the edge function, detect whether the file path starts with `bidding_` (after stripping prefixes). If it does, prepend `specifications/`. If it doesn't (linked project file), use the path as-is under the `project-files` bucket root. Specifically:
- Paths like `691271e6-e46f-4745-8efb-200500e819f0/2fc77bbd...` → URL: `project-files/{path}`
- Paths like `bidding_xxx` or already containing `specifications/` → URL: `project-files/specifications/{path}`

## Files to Change
1. **`supabase/functions/send-bid-package-email/index.ts`** — Fix `generateFileDownloadLinks` URL logic; increase label widths from 120px to 140px across all rows; improve Contact field fallback text.
2. **`src/components/bidding/SendTestEmailModal.tsx`** — Fetch manager info directly from `users` table instead of relying on `useCompanyUsers()` hook.
3. **`src/components/bidding/SendBidPackageModal.tsx`** — Same manager lookup fix.
4. **`src/components/bidding/SendSingleCompanyEmailModal.tsx`** — Same manager lookup fix.

