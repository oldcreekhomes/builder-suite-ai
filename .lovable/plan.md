
Goal
- Make the “Purchase Orders” area under the Vendor field always show something immediately after a vendor is selected:
  - “Checking purchase orders…” while loading
  - A list of POs when found
  - A clear “No approved purchase orders found for this vendor on this project” message when none
  - A clear “Couldn’t load purchase orders” message when there is a query/RLS/SQL error (instead of silently showing nothing)

Why you’re seeing “nothing”
- Right now VendorPOInfo returns null in multiple cases:
  - While loading (isLoading true)
  - When the query errors (purchaseOrders is undefined)
  - When there are zero rows
- So even if something is failing (permissions, query error, vendorId not actually being a UUID), the UI hides the entire section and you see “nothing”.

What we’ll change (behavior)
1) Under Vendor, always render a “Purchase Orders” panel as soon as a vendor is selected.
2) Show a loading state immediately (so you know it’s doing something).
3) If the query returns 0 POs, show a friendly “No POs found” message (not blank).
4) If the query errors, show a visible error message and log the error to console so we can diagnose quickly.
5) Add a small “Vendor linked” line (non-technical) so we can confirm the selection is actually tied to a vendor record (UUID) rather than free text.

Implementation steps (code)
A) Update `src/components/bills/VendorPOInfo.tsx`
- Change the early-returns so the component doesn’t disappear.
- Render logic:
  - If no vendorId: render nothing (keep as-is).
  - If isLoading: render a small panel with “Checking purchase orders…”.
  - If error: render a small panel with “Couldn’t load purchase orders” + (optional) short “Try refreshing” text; also `console.error` the error.
  - If purchaseOrders is empty: render a small panel that says “No approved purchase orders found for this vendor on this project.”
  - If purchaseOrders has entries: render list as it does now.
- Add an optional “Vendor linked” line:
  - Example: “Vendor linked” (and optionally show last 6 chars of vendorId) to confirm it’s not just display text.
  - Keep this subtle and not scary; the goal is clarity.

B) Add a safety net in `src/components/bills/ManualBillEntry.tsx`
- Currently, `vendorName` is set via `onCompanySelect`. If for any reason that callback doesn’t run (timing/edge case), the input can still show the right text, but we lose display consistency.
- Add a small effect: when `vendorId` is set and `vendorName` is empty, fetch the company name for that id and set `vendorName`.
  - This ensures the Vendor field and the PO panel stay consistent even on odd selection flows.

C) (Optional but recommended) Add a very small visible “PO connection summary”
- If there is exactly 1 PO, show “This bill will be linked to PO #### by default (unless you override per line item).”
- If there are 2+ POs, show “Choose a PO per line item below (or leave Auto-match).”
- This matches your expectation: even if there’s 1 PO, you should see that it’s linking to something.

Diagnostics / Verification steps (what you should see)
1) Go to Manage Bills → Enter Manually for project 115 E. Oceanwatch Ct.
2) Select Carter Lumber / ABC Building Supply.
3) Immediately under Vendor you should see:
   - “Checking purchase orders…” (briefly), then
   - A list of POs (for those vendors that have them), OR
   - “No approved purchase orders found…” if none exist, OR
   - “Couldn’t load purchase orders…” if there’s a permissions/query error.
4) If you still see no POs for vendors that you know have them, the panel will surface the exact failure mode (error vs. empty), which tells us the next fix:
   - Empty: vendorId mismatch (wrong company selected) or POs not actually approved for that vendor/project in this environment
   - Error: RLS/policy issue or query/join issue (we’ll fix the policy or query)

Files to modify
- `src/components/bills/VendorPOInfo.tsx` (make the PO panel always visible when vendor selected; add loading/empty/error states)
- `src/components/bills/ManualBillEntry.tsx` (fallback fetch for vendorName when vendorId is present)

Edge cases considered
- If a vendor truly has no approved POs: you’ll see a clear “No approved purchase orders…” message (not blank).
- If there’s a Supabase permission/RLS error: you’ll see a clear “Couldn’t load purchase orders…” message (not blank), making it actionable.
- If vendor selection is still not setting a UUID in some pathway: the “Vendor linked” line will help confirm immediately.

After this fix (next likely follow-up if needed)
- If we see an error, we’ll inspect Supabase RLS policies on `project_purchase_orders`, `bill_lines`, and `bills` and adjust policies so authenticated project members can read approved POs for their project.