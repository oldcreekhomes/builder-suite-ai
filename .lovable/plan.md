
## What’s happening (why you don’t see the PO selector)

On the Manual Bill Entry page, the “Purchase Order” column (and the per-line PO dropdown) only appears when:

- `projectId` is present (it is, from your URL), and
- `vendor` is a **vendor UUID**, and
- that vendor has **2+ approved POs** on that project.

You *do* have 3 approved POs for **ABC Building Supply** on project `f13eae11-ab55-4034-b70c-734fc3afe340` (confirmed in the database). So the only remaining reason the PO column is missing is:

**The “Vendor” field is currently storing the vendor name text instead of the vendor UUID.**

In the screenshot, the Vendor input shows “ABC Building Supply”, but that does not guarantee the stored value is the UUID; it can be free-form text. When that happens, `useVendorPurchaseOrders(projectId, vendorId)` filters `company_id = vendorId`, which returns 0 rows because `vendorId` is not a UUID → `showPOSelection` stays false → no “Purchase Order” column.

### Why the last fix didn’t fully solve it
We added a blur auto-select that runs only when `!value`. But if the parent value is currently `"ABC Building Supply"` (non-empty), then `!value` is false and the auto-select never runs. So the field can still “look selected” while storing text.

---

## Goal

Make Manual Bill Entry always store a true **vendor UUID**, while still showing the vendor’s display name in the input, so the PO column reliably appears.

---

## Implementation approach (safe, minimal, and form-specific)

### A) ManualBillEntry: split vendor into `vendorId` and `vendorName`
Change Manual Bill Entry to keep:
- `vendorId` (UUID, used for queries + saving)
- `vendorName` (string, used for display only)

Then render:
- `<VendorSearchInput value={vendorId} displayValue={vendorName} onCompanySelect={...} onChange={setVendorId} />`

This uses the `VendorSearchInput` component the way it was designed (it already supports `displayValue`), without changing other parts of the app.

**Behavior:**
- If you click a company in the dropdown, we set both `vendorId` + `vendorName`.
- If you type and blur, we’ll still try to auto-resolve to a UUID (see part B).
- When saving the bill, we use `vendorId`.

### B) VendorSearchInput: treat “non-UUID value” as not-selected for auto-select
Update `handleInputBlur` to attempt an exact-match auto-select when:
- the typed `searchQuery` matches an existing company name, and
- the current `value` is either empty OR **not a UUID**

This closes the gap where value might be `"ABC Building Supply"` (truthy) but not a UUID.

Implementation detail:
- Add a small helper `isUuid(value)` using a simple UUID v4-ish regex (or a permissive UUID regex).
- Change condition from `if (searchQuery && !value)` to `if (searchQuery && (!value || !isUuid(value)))`.

This keeps the existing “free-form text” capability for places that want it, but ensures forms expecting UUIDs can still get a UUID even if a name string slipped into `value`.

### C) ManualBillEntry: ensure PO selection uses `vendorId`
Update:
- `const showPOSelection = useShouldShowPOSelection(projectId, vendorId);`
- `vendorId` passed into `<POSelectionDropdown vendorId={vendorId} />`
- Save uses `vendorId` for `billData.vendor_id`

### D) Add a small, explicit “Vendor recognized” indicator (debug-friendly)
Keep (or slightly enhance) the message under Vendor:
- If `vendorId` is a UUID and `showPOSelection` true → “This vendor has multiple POs — select in Job Cost rows below”
- If the user typed text that matches a vendor name but we still don’t have a UUID → show a subtle warning like:
  - “Select a vendor from the list to enable PO selection”

This makes it obvious when the field is display-only vs truly selected.

---

## Verification steps (what you should see after the fix)

1. Go to: `/project/f13eae11-ab55-4034-b70c-734fc3afe340/accounting/bills/approve`
2. In Vendor, type **ABC Building Supply**, then either:
   - click the dropdown result, or
   - type it exactly and click out (blur)
3. You should then see:
   - the blue helper text indicating multiple POs, and
   - in the Job Cost grid header: a new **Purchase Order** column
4. On the line item row, you’ll see a dropdown with:
   - “Auto-match by cost code”
   - 3 PO options (with remaining balances)
5. Choosing “4430 - Roofing” should highlight the matching PO (and you can explicitly select it).

---

## Files to change

1. `src/components/bills/ManualBillEntry.tsx`
   - Split vendor state into `vendorId` + `vendorName`
   - Pass `displayValue` and `onCompanySelect` to VendorSearchInput
   - Use `vendorId` for PO logic and saving

2. `src/components/VendorSearchInput.tsx`
   - Add UUID detection helper
   - Expand blur auto-select condition to also handle “value is non-UUID string”

---

## Risks / edge cases considered

- Other forms may rely on the “free-form” capability of VendorSearchInput; this plan avoids breaking them by:
  - using `displayValue` + `onCompanySelect` in ManualBillEntry (form-specific correctness)
  - only broadening blur auto-select to handle the specific “value is not UUID” case (still safe because it only triggers when there is an exact name match)
- If a vendor name is ambiguous (two companies with identical names), the exact-match logic could be ambiguous; we can choose the first match, but ideally we’d disambiguate later if this comes up (rare in practice).

---

## Optional follow-up (once PO selection is visible)
After the UI appears, we should still update the downstream matching priority (`useBillPOMatching.ts`) to respect `purchase_order_id` first (as originally planned). That’s separate from this “PO selector not appearing” issue, but it’s important for reporting consistency.