

## Fix Missing PO on Approval + Replace Actions Dropdown with Three Dots

### Problem 1: Missing "Decks" PO (and all POs lost on approval)

The `approve_pending_bill` database function copies lines from `pending_bill_lines` to `bill_lines` but **does not include `purchase_order_id`** or `purchase_order_line_id` in the INSERT statement. This means all PO assignments made during the "Enter with AI" stage are silently dropped when a bill is approved. The matching on the Review tab then falls back to composite key lookup (project + vendor + cost code), which only finds POs where those three fields happen to match -- missing any PO that was explicitly assigned to a different cost code.

**Fix**: Add a new migration that updates the `approve_pending_bill` function to include `purchase_order_id` and `purchase_order_line_id` in the `bill_lines` INSERT. Then backfill the existing Four Seasons bill so you don't need to re-approve it.

### Problem 2: Actions column uses a Select dropdown instead of three dots

The Review tab currently uses a `<Select>` dropdown with "Actions" placeholder. Per the project's standardization philosophy, this should use the `TableRowActions` component (three dots / `MoreHorizontal` icon) with Approve, Edit, and Reject as menu items.

---

### Technical Changes

**New Migration File**: `supabase/migrations/fix_approve_pending_bill_purchase_order.sql`
- `CREATE OR REPLACE FUNCTION public.approve_pending_bill(...)` adding `purchase_order_id` and `purchase_order_line_id` to the INSERT into `bill_lines` (copying from `line_record.purchase_order_id` and `line_record.purchase_order_line_id`).

**File: `src/components/bills/BillsApprovalTable.tsx`**
- Replace the `<Select>` dropdown in the Actions column (lines 948-967) with `<TableRowActions>` using three actions:
  - "Approve" (default variant, triggers handleActionChange with 'approve')
  - "Edit" (default variant, triggers handleActionChange with 'edit')
  - "Reject" (destructive variant, triggers handleActionChange with 'reject')
- Remove the `actionValue` state and `SelectTrigger`/`SelectContent` imports if no longer needed elsewhere.
- Keep the existing non-draft logic (reconciled check mark / dash) unchanged.

