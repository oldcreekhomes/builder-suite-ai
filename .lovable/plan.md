

## Fix: Show All Matched POs in the Enter with AI Tab Dialog

### Problem
When a bill has 3 line items tied to 3 different POs, clicking "Matched" on the Enter with AI tab opens a dialog showing only 1 PO (the first one found). This is because line 162 of `BatchBillReviewTable.tsx` uses `.find()` which returns only the first match:

```
const matchedPO = vendorPOs?.find(po => poDialogPoIds.includes(po.id)) || null;
```

The other tabs (Approved, Rejected, Paid) already use `BillPOSummaryDialog` which correctly handles multiple POs. The Enter with AI tab bypasses this and goes straight to the single-PO `PODetailsDialog`.

### Solution
Replace the single-PO dialog logic in `BatchBillReviewTable.tsx` with `BillPOSummaryDialog`, which:
- When 1 PO: automatically shows the single PO detail (no change in behavior)
- When multiple POs: shows the summary table with all POs, allowing drill-down

### Changes (all in `src/components/bills/BatchBillReviewTable.tsx`)

**1. Add import for `BillPOSummaryDialog`**
- Import `BillPOSummaryDialog` from `./BillPOSummaryDialog`
- Import `POMatch` from `@/hooks/useBillPOMatching`

**2. Build POMatch array from the matched PO data**
- Replace the single `matchedPO` variable (line 162) with logic that builds a `POMatch[]` array from `vendorPOs` filtered by `poDialogPoIds`
- For each matched PO, construct the POMatch object with `po_id`, `po_number`, `po_amount`, `total_billed` (from billed data), `remaining`, `status`, `cost_code_id`, and `cost_code_display`
- To get billed-to-date amounts, fetch bill_lines data for the matched POs (or use a simpler approach: pass the matches to `BillPOSummaryDialog` which already fetches vendor POs internally)

**3. Replace the dialog rendering (lines 950-976)**
- Replace the `PODetailsDialog` with `BillPOSummaryDialog`
- Pass the constructed `matches` array and a `bill` object built from the pending bill's extracted data
- The `BillPOSummaryDialog` already handles: single PO (goes directly to detail), multiple POs (shows summary table), and fetches vendor POs internally via `useVendorPurchaseOrders`

**Simplified approach:** Since `BillPOSummaryDialog` already uses `useVendorPurchaseOrders` internally, we need to build POMatch objects. The simplest path is to use `useBillPOMatching` for the selected bill (which already builds the full POMatch data including billed-to-date), or construct minimal POMatch objects from the `vendorPOs` data.

The cleanest approach: construct POMatch objects from `vendorPOs` (which are already fetched) and the pending bill lines, then pass them to `BillPOSummaryDialog`.

### Technical Detail

Replace lines 160-162 and 950-976 with:

```tsx
// Line 160-162: Build matches array instead of single matchedPO
const poDialogMatches: POMatch[] = useMemo(() => {
  if (!vendorPOs || !poDialogPoIds.length) return [];
  return vendorPOs
    .filter(po => poDialogPoIds.includes(po.id))
    .map(po => ({
      po_id: po.id,
      po_number: po.po_number || 'Unknown',
      po_amount: po.total_amount || 0,
      total_billed: 0, // BillPOSummaryDialog recalculates via its own data
      remaining: po.total_amount || 0,
      status: 'matched' as const,
      cost_code_id: po.cost_code_id || '',
      cost_code_display: po.cost_codes
        ? `${po.cost_codes.code}: ${po.cost_codes.name}`
        : 'Unknown',
    }));
}, [vendorPOs, poDialogPoIds]);
```

```tsx
// Lines 950-976: Replace PODetailsDialog with BillPOSummaryDialog
{poDialogBillId && poDialogMatches.length > 0 && (
  <BillPOSummaryDialog
    open={!!poDialogBillId}
    onOpenChange={(open) => { if (!open) setPoDialogBillId(null); }}
    matches={poDialogMatches}
    bill={{
      id: poDialogBillId,
      project_id: projectId || null,
      vendor_id: poDialogVendorId,
      total_amount: /* computed from extracted_data */,
      reference_number: /* from extracted_data */,
      bill_lines: /* map pending bill lines to BillLine format */,
    }}
  />
)}
```

### What stays the same
- `usePendingBillPOStatus` hook -- correctly finds all matched PO IDs (no change needed)
- `BillPOSummaryDialog` -- already works for 1 PO (auto-drills to detail) and multiple POs (shows summary table)
- `PODetailsDialog` -- still used internally by `BillPOSummaryDialog` for drill-down
- PO status badge logic -- unchanged

### Result
- 1 line item, 1 PO: Same behavior as before (detail dialog opens directly)
- 3 line items, 3 POs: Summary dialog shows all 3 POs with their amounts, allowing drill-down into each one

