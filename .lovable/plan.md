## Goal
Off-board Danny Sheehan immediately (kill all sessions now, block future logins) while keeping his row in Employee Management with a **Revoked** status badge so he can be reactivated in one click if rehired. Place the new **Revoke Access** menu item as a destructive (red) action **below Delete** in the row action menu, so it's the most prominent off-boarding option.

## Changes

### 1. Add `access_revoked` boolean column to `public.users` (default `false`)
Cleanly distinguishes three states in the Employees table:
- `confirmed = true` and `access_revoked = false` → **Active**
- `confirmed = false` and `access_revoked = false` → **Pending Invitation** (existing behavior)
- `access_revoked = true` → **Revoked**

We don't reuse `confirmed = false` for revoked because that already means "invited but hasn't accepted." Mixing them would mislabel pending invites as fired employees.

### 2. New edge function `revoke-employee-access`
Mirrors `delete-employee`'s auth checks (caller must be `owner`, target must belong to caller's company, target cannot be an owner, no self-revoke), then in this order:

1. **Ban the auth user permanently** — `supabase.auth.admin.updateUserById(employeeId, { ban_duration: '876000h' })`. Blocks all future logins and refresh-token rotation.
2. **Kill every active session immediately** — `supabase.auth.admin.signOut(employeeId, 'global')`. Invalidates every refresh token on every device right now. Combined with the ban, Danny's open tabs get a 401 on the next API call and bounce to login; he can't sign back in.
3. **Mark the row** — set `public.users.access_revoked = true`. Leaves `confirmed` untouched so we never lose the original invite state.
4. **Recalculate Stripe seat count** — same logic as `delete-employee` (1 + remaining employees where `access_revoked = false`), push new quantity to the subscription.

Leaves his `public.users` row, `user_roles`, `created_by`/`updated_by` stamps, uploaded files, bills, POs, JEs, messages, etc. completely intact.

### 3. New edge function `restore-employee-access`
The "rehire" flow. Same authorization checks, then:
1. `supabase.auth.admin.updateUserById(employeeId, { ban_duration: 'none' })` — lifts the ban
2. `public.users.access_revoked = false`
3. Recalculate Stripe seat count (+1)

Danny can immediately log in again with his original password and reappears in every picker.

### 4. UI updates in `src/components/employees/EmployeeTable.tsx`
- **Status badge** logic:
  - `access_revoked` → red `destructive` badge labeled **Revoked**
  - else `confirmed` → existing **Active** badge
  - else → existing **Pending Invitation** badge
- **Row action menu** order (owner only, top → bottom):
  1. View as User (existing — hidden on revoked rows)
  2. Edit (existing)
  3. Delete (existing destructive)
  4. **Revoke Access** — destructive (red), placed directly **below Delete** per the screenshot, with confirmation dialog: "Danny will be signed out of every device immediately and unable to log in again. All historical data is preserved." Hidden when the row is already revoked.
  5. **Make Active** — only shown when `access_revoked = true`; calls `restore-employee-access`. Replaces Revoke Access in the menu for revoked rows.

### 5. Filter sweep — hide revoked employees from operational surfaces
Update every place that filters `confirmed = true` on `public.users` to also exclude `access_revoked = true`:
- `src/hooks/useCompanyUsers.ts` (owner branch + internal-user branch)
- `src/hooks/useProjectResources.ts`
- `src/components/files/FolderAccessModal.tsx` company-employees query
- Any other employee pickers / chat-roster queries that surface employees by `home_builder_id`

The Employees settings table is the only place that intentionally shows revoked rows.

## What stays untouched
- All accounting data created or stamped by Danny.
- His `user_roles` row, notification preferences, folder-access grants, audit history.
- The existing `delete-employee` flow — kept for true purges.

## Verification
1. Open Danny's row action menu → see Delete (red) and **Revoke Access** (red) directly underneath.
2. Click **Revoke Access** → confirm dialog → within seconds his open browser tab gets a 401 and bounces to login; fresh login returns banned error.
3. Employees table still lists Danny with a red **Revoked** badge; the menu now shows **Make Active** instead of Revoke Access.
4. Open a bill he created → his name still renders in Created By.
5. Employee pickers on PO, chat roster, Folder Access — Danny no longer appears.
6. Stripe seat count decremented by 1.
7. Click **Make Active** → ban lifted, badge flips to **Active**, he can log in, reappears in pickers, Stripe seat count goes back up by 1.