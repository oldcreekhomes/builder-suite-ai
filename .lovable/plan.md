

# Fix: Allow All Company Users to Upload Attachments (Including Accountants)

## Root Cause

The `project-files` storage bucket has RLS policies that only allow:
- `role = 'owner'`
- `role = 'employee' AND confirmed = true`

The `accountant` role is **explicitly excluded** from the INSERT/UPDATE/DELETE policies. This causes Joanne (an accountant) to get "Upload failed" errors when trying to add journal entry attachments.

Your access control design is correct: the `TransactionsGuard` component already checks `can_access_transactions` permission before allowing users to access the Journal Entry page. The storage-level RLS should NOT be doing additional role-based filtering - it should simply allow all confirmed company members.

---

## Solution

Update the storage policies to allow **any confirmed company user** (owner, employee, OR accountant) to upload, update, and delete files in the `project-files` bucket. This follows your architectural pattern where access control is managed at the application level via the Access area permissions, not through RLS role checks.

---

## Database Changes Required

### 1. Drop the existing role-restrictive policies

```sql
DROP POLICY IF EXISTS "Owners and employees can upload project files" ON storage.objects;
DROP POLICY IF EXISTS "Owners and employees can update project files" ON storage.objects;
DROP POLICY IF EXISTS "Owners and employees can delete project files" ON storage.objects;
DROP POLICY IF EXISTS "Owners and employees can view project files" ON storage.objects;
```

### 2. Create new policies that include all confirmed company users

```sql
-- INSERT: Allow all confirmed company users to upload
CREATE POLICY "Company users can upload to project-files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'project-files' AND
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND (
      u.role = 'owner' OR 
      (u.confirmed = true AND u.role IN ('employee', 'accountant'))
    )
  )
);

-- UPDATE: Allow all confirmed company users to update
CREATE POLICY "Company users can update in project-files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'project-files' AND
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND (
      u.role = 'owner' OR 
      (u.confirmed = true AND u.role IN ('employee', 'accountant'))
    )
  )
);

-- DELETE: Allow all confirmed company users to delete
CREATE POLICY "Company users can delete from project-files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'project-files' AND
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND (
      u.role = 'owner' OR 
      (u.confirmed = true AND u.role IN ('employee', 'accountant'))
    )
  )
);

-- SELECT: Allow all confirmed company users to view
CREATE POLICY "Company users can view project-files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'project-files' AND
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND (
      u.role = 'owner' OR 
      (u.confirmed = true AND u.role IN ('employee', 'accountant'))
    )
  )
);
```

---

## Why This Works

| Before | After |
|--------|-------|
| Storage policy checks `role = 'owner' OR role = 'employee'` | Storage policy checks `role IN ('owner', 'employee', 'accountant')` |
| Accountants blocked at storage level | Accountants can upload like everyone else |
| Access control duplicated (RLS + app guards) | Access control centralized in Access area permissions |

The `TransactionsGuard` already prevents unauthorized users from accessing the Journal Entry page. Once they're on the page (meaning they have `can_access_transactions` permission), they should be able to upload files without the storage layer blocking them based on role.

---

## No Code Changes Required

The application code in `useJournalEntryAttachments.ts` and `JournalEntryAttachmentUpload.tsx` is already correct. The only issue is the storage-level RLS policy excluding accountants.

