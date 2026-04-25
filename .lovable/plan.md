## Updates to `CreatePurchaseOrderDialog.tsx`

### 1. Red styling for "Extra" checkbox column and "Actions" trash button
- **Extra checkbox** (line ~548): add `className="border-destructive data-[state=checked]:bg-destructive data-[state=checked]:text-destructive-foreground"` so the checkbox renders red.
- **Actions trash button** (line ~553-563): change the `Trash2` icon class from `text-muted-foreground` to `text-destructive`, and add `hover:bg-destructive/10` to the button.

> Note: The user said "status cans" — interpreting that as the "Extra" checkbox column (the only checkbox/status-like control in the line items table). Will confirm via the UI screenshot context where these are the only red-eligible per-row controls.

### 2. Title Case for Description field
- Add a small helper `toTitleCase(str)` that lowercases the string then capitalizes the first letter of each word (split on whitespace), e.g. `"CONSTRUCTION SURVEY"` → `"Construction Survey"`.
- Apply it on description input change so it's stored/displayed in Title Case:
  ```ts
  onChange={(e) => updateLine(idx, { description: toTitleCase(e.target.value) })}
  ```
- Also normalize any AI-extracted `initialLineItems` and existing edit lines via the same helper when seeding state, so pre-filled descriptions (like the all-caps "12. CONSTRUCTION SURVEY...") render correctly.

### 3. Footer becomes 3 equal columns: Custom Message · Attachments · Sending To
- Change `<div className="grid grid-cols-2 gap-4">` (line 586) to `<div className="grid grid-cols-3 gap-4">`.
- Keep Custom Message (col 1) and Attachments (col 2) as-is.
- Add a new **Sending To** column (col 3):
  - **Bidding flow (`isBidFlow`)**: query the bidding company's representatives where `receive_bid_notifications = true` (matching the pattern in `SendSingleCompanyEmailModal.tsx` lines 44-77), filtered by project region. Render the company name as a header and each rep's full name as a small chip (`inline-flex bg-muted px-2 py-1 rounded text-xs`).
  - **Manual flow (no bidContext)**: query the selected company's reps where `receive_po_notifications = true` (or equivalent — will verify the exact column on `company_representatives` for PO notifications; if no PO-specific column exists, reuse `receive_bid_notifications`). Re-run the query whenever `selectedCompany` changes. Show "Select a company to see recipients" when empty.
  - Use a `useQuery` with key `['po-recipients', companyId, projectId]` and pull `projects.region` for the regional filter (same shape as the existing modal).

### 4. No other changes
- No DB migrations.
- No changes to mutation payloads — recipients are already resolved server-side by `send-po-email`; this column is purely informational so the user knows who will receive the PO.
- No layout changes to header, table, or buttons.

### Files touched
- `src/components/CreatePurchaseOrderDialog.tsx` (only file)
