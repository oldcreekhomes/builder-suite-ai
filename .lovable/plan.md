

## Cleanup Plan: Delete 120 Fake Purchase Orders

### What Happened

A flawed database migration (`20260130193653_4de6975f-8bac-4ecd-8554-d7ab25a8e061.sql`) ran on January 30, 2026 and incorrectly created Purchase Orders for ALL vendors who submitted bids on closed packages - not just the winning vendor.

**Good news**: No emails were sent to vendors because the migration inserted records directly into the database, bypassing the application code that triggers the `send-po-email` edge function.

---

### Scope of Cleanup

| Project | Fake POs to Delete |
|---------|-------------------|
| 859 N Lexington | 33 |
| 5701 9th Street | 24 |
| 5707 9th St N | 20 |
| 923 17th St South | 17 |
| 115 E. Oceanwatch Ct | 16 |
| 126 Longview Drive | 7 |
| 103 E Oxford Ave | 2 |
| 7659 Waterloo Farm Rd | 1 |
| **TOTAL** | **120** |

---

### Implementation Steps

**Step 1: Create Edge Function `delete-fake-pos`**

Create a new edge function that:
1. Authenticates the caller (owner role required)
2. Finds all POs matching the migration criteria:
   - `notes = 'Auto-generated PO for previously closed bid'`
   - `created_at` between `2026-01-30 19:36:52` and `2026-01-30 19:36:53`
3. Sets `purchase_order_id = NULL` on any `bill_lines` or `pending_bill_lines` referencing these POs (to avoid foreign key violations)
4. Deletes the 120 fake POs
5. Returns a detailed report of what was deleted

**Step 2: Deploy and Execute**

Deploy the edge function and call it immediately to remove the fake POs.

**Step 3: Delete the Bad Migration File**

Remove `supabase/migrations/20260130193653_4de6975f-8bac-4ecd-8554-d7ab25a8e061.sql` to prevent it from running on any future environments.

---

### Safety Measures

| Safety Check | Implementation |
|--------------|----------------|
| Authentication | Caller must be authenticated owner |
| Precise targeting | Only deletes POs with EXACT note text AND timestamp window |
| Foreign key safety | Clears `purchase_order_id` references before deletion |
| Real POs protected | Normal workflow POs never have this specific note |
| No email impact | Vendors already unaware of fake POs |

---

### Files to Create/Delete

| File | Action |
|------|--------|
| `supabase/functions/delete-fake-pos/index.ts` | **CREATE** - Edge function to delete fake POs |
| `supabase/migrations/20260130193653_4de6975f-8bac-4ecd-8554-d7ab25a8e061.sql` | **DELETE** - Remove bad migration |

---

### Expected Result

After execution:
- 120 fake POs will be deleted
- 315 legitimate POs remain untouched
- Bad migration file removed
- No vendor communication affected

