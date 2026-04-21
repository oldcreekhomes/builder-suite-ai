

## Plan: Fix pending bill PDF access the way you want — company boundary only in RLS, employee access controlled in the Employee tab

### Core rule

For bill PDFs, RLS will **not** decide whether JOle, Matt, or any Old Creek employee has bill access based on individual permissions.

RLS will only enforce the hard company wall:

- Old Creek Homes users can read Old Creek bill PDFs.
- Other builders cannot read Old Creek bill PDFs.
- The Employee tab remains the place where you control who can access Manage Bills / Accounting in the app.

That matches the existing product rule in memory: app-level permissions are controlled through `user_notification_preferences`; RLS should be wide for confirmed company members and only protect tenant isolation.

### What is wrong right now

The current pending bill storage policy is too narrow:

```sql
pending/<uploader_user_id>/<file>
```

and the SELECT policy says only the uploader can read that folder.

So when JOle uploads:

```text
pending/JOLE_USER_ID/Invoice_C26019.pdf
```

Matt is blocked by storage RLS even though both users belong to Old Creek Homes.

That is the part I will remove.

### Database/storage fix

Create a migration that removes the per-uploader pending-folder access rules:

```sql
DROP POLICY IF EXISTS "Users can read from their pending folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete from their pending folder" ON storage.objects;
```

Then add company-boundary-only policies for `bill-attachments/pending/*`.

The policy will check the matching `pending_bill_uploads.file_path` row and allow access if the logged-in user is either:

1. the owner/home builder for that upload, or
2. a confirmed user whose `home_builder_id` equals that upload’s `owner_id`

No check for `can_access_manage_bills`.
No check for `can_access_accounting`.
No per-employee permission logic inside storage RLS.

Those access toggles stay in the app via:

- `ManageBillsGuard`
- `useAccountingPermissions`
- `EmployeeAccessPreferences`
- `user_notification_preferences`

### Keep tenant isolation intact

I will not make the bucket public.

The URL you pasted is a public storage URL:

```text
/storage/v1/object/public/bill-attachments/...
```

That will continue to fail because `bill-attachments` is private. That is correct for security.

The app should open these files through authenticated Supabase storage access, not public links.

### Code fix

Update `src/components/files/hooks/useFilePreview.ts` so private bill PDFs do not fall back to broken public URLs.

Current behavior:

1. signed/download access fails
2. app falls back to `getPublicUrl()`
3. browser shows `Bucket not found`

New behavior:

1. signed/download access uses the new company-wide storage policy
2. Old Creek employees can preview/download pending PDFs uploaded by any Old Creek employee
3. if access is truly denied, show a clear permission/storage error instead of a fake public link

### What I will not do

- I will not add employee-level bill-file permission checks into RLS.
- I will not use `can_access_manage_bills` inside storage policies.
- I will not make `bill-attachments` public.
- I will not expose Old Creek files to other builders.
- I will not change the Employee tab permission model.

### Verification

After implementation:

1. JOle uploads a pending bill for 923 17th Street.
2. Matt opens the same pending bill PDF from Manage Bills.
3. Preview works.
4. Download works.
5. Matt uploads a pending bill and JOle can open it if she has app-level access to Manage Bills.
6. A user from another builder cannot open the file.
7. Employee tab access still controls whether an employee can reach Manage Bills in the UI.

### Files/areas changed

1. New migration — replace per-uploader pending storage SELECT/DELETE policies with company-boundary-only policies.
2. `src/components/files/hooks/useFilePreview.ts` — remove misleading public URL fallback for private `bill-attachments` files and show a real error if authenticated storage access fails.
3. Project memory — reinforce the rule that employee permissions stay app-level; RLS only enforces tenant/company isolation.

