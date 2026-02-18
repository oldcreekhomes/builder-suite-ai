
## Fix: RLS Policies on `bill_attachments` for Pending Upload Attachments

### Root Cause

The error "new row violates row-level security policy for table 'bill_attachments'" happens because the INSERT policy added in the previous migration checks:

```sql
pending_bill_uploads.owner_id = auth.uid()
```

But `pending_bill_uploads.owner_id` stores the **home builder's** user ID (the company owner), not the employee's or accountant's `auth.uid()`. This is by design (per the multi-tenant architecture), but the RLS policy doesn't account for it.

The same mismatch exists on the SELECT and DELETE policies for pending-upload-linked attachments.

### What Needs to Change

**One database migration** — fix all three policies (INSERT, SELECT, DELETE) on `bill_attachments` that reference `pending_bill_uploads` to also allow employees and accountants who belong to the same home builder.

**INSERT policy** — currently:
```sql
-- BROKEN: only passes if user IS the owner
pending_bill_uploads.owner_id = auth.uid()
```
Fix: also allow when `auth.uid()` is a confirmed employee/accountant whose `home_builder_id` matches `pending_bill_uploads.owner_id`:
```sql
pending_bill_uploads.owner_id = auth.uid()
OR pending_bill_uploads.owner_id IN (
  SELECT home_builder_id FROM users
  WHERE id = auth.uid() AND confirmed = true
  AND role IN ('employee', 'accountant')
)
```

**SELECT policy** — currently only looks at `bill_id → bills.owner_id`. It doesn't cover rows where `bill_id IS NULL` and `pending_upload_id IS NOT NULL`. Add a second clause to cover those.

**DELETE policy** — same fix as INSERT.

### Files Changed

**Database only** — one migration replacing the three pending-upload policies on `bill_attachments`. No code changes needed in `EditExtractedBillDialog.tsx` — the upload logic is correct, only RLS is blocking it.

### Migration SQL (outline)

```sql
-- Drop the broken policies
DROP POLICY IF EXISTS "Users can insert bill_attachments for their pending uploads" ON bill_attachments;
DROP POLICY IF EXISTS "Users can delete bill_attachments for their pending uploads" ON bill_attachments;

-- Recreate INSERT with employee/accountant support
CREATE POLICY "Users can insert bill_attachments for their pending uploads"
  ON bill_attachments FOR INSERT
  WITH CHECK (
    pending_upload_id IS NULL
    OR EXISTS (
      SELECT 1 FROM pending_bill_uploads pbu
      WHERE pbu.id = pending_upload_id
        AND (
          pbu.owner_id = auth.uid()
          OR pbu.owner_id IN (
            SELECT home_builder_id FROM users
            WHERE id = auth.uid()
              AND confirmed = true
              AND role IN ('employee', 'accountant')
          )
        )
    )
  );

-- Recreate DELETE with same fix
CREATE POLICY "Users can delete bill_attachments for their pending uploads"
  ON bill_attachments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM pending_bill_uploads pbu
      WHERE pbu.id = pending_upload_id
        AND (
          pbu.owner_id = auth.uid()
          OR pbu.owner_id IN (
            SELECT home_builder_id FROM users
            WHERE id = auth.uid()
              AND confirmed = true
              AND role IN ('employee', 'accountant')
          )
        )
    )
  );

-- Also fix SELECT policy to cover pending-upload-linked attachments
-- (the current SELECT policy only covers bill_id-linked rows)
DROP POLICY IF EXISTS "Bill attachments visible to owner and confirmed employees" ON bill_attachments;
CREATE POLICY "Bill attachments visible to owner and confirmed employees"
  ON bill_attachments FOR SELECT
  USING (
    -- Rows linked to an approved bill
    (bill_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM bills b
      WHERE b.id = bill_id
        AND (
          b.owner_id = auth.uid()
          OR b.owner_id IN (
            SELECT home_builder_id FROM users
            WHERE id = auth.uid() AND confirmed = true
            AND role IN ('employee', 'accountant')
          )
        )
    ))
    OR
    -- Rows still linked to a pending upload (not yet approved)
    (pending_upload_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM pending_bill_uploads pbu
      WHERE pbu.id = pending_upload_id
        AND (
          pbu.owner_id = auth.uid()
          OR pbu.owner_id IN (
            SELECT home_builder_id FROM users
            WHERE id = auth.uid() AND confirmed = true
            AND role IN ('employee', 'accountant')
          )
        )
    ))
  );
```

No code changes required — the dialog's upload logic is correct.
