
## Fix RLS Policies on `bill_attachments` for Employees & Accountants

### What's Wrong

Three policies on `bill_attachments` are broken for non-owner users (employees, accountants):

1. **INSERT** — only allows the home builder owner (`pending_bill_uploads.owner_id = auth.uid()`). Employees and accountants are blocked.
2. **DELETE** — same restriction, employees can't remove attachments they added.
3. **SELECT** — only covers rows linked to an approved `bill_id`. Rows still linked to a `pending_upload_id` (i.e., attachments added in the Edit Extracted Bill dialog before approval) are invisible to employees.

### The Fix — One Migration

**DROP and RECREATE** three policies to add the employee/accountant check alongside the owner check:

**INSERT policy** — allow if:
- The `pending_bill_uploads.owner_id` is the current user (owner), OR
- The current user is a **confirmed employee or accountant** whose `home_builder_id` matches `pending_bill_uploads.owner_id`

**DELETE policy** — same logic as INSERT.

**SELECT policy** — add a second `OR` branch covering rows where `pending_upload_id IS NOT NULL`, using the same owner-or-employee check.

### Technical Details

The employee check in all three policies:
```sql
pbu.owner_id IN (
  SELECT home_builder_id FROM users
  WHERE id = auth.uid()
    AND confirmed = true
    AND role IN ('employee', 'accountant')
)
```

This ties access directly to the employee's profile record — specifically their `confirmed` flag and `home_builder_id`. No unconfirmed employees or users from other companies can access the data.

### What Changes

- **Database only** — one migration file
- **No frontend changes** — `EditExtractedBillDialog.tsx` is correct
- After this migration, any confirmed employee or accountant belonging to the home builder will be able to add, view, and remove attachments on pending bill uploads
