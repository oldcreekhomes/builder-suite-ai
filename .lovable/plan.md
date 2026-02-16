

## Fix Three Issues: Memo, PO Line Dropdown, and Confidence Column

### Issue 1: Memo Field Shows Full Invoice Body Text

**Problem**: The previous fix changed `memo: line.memo || ""` to `memo: line.memo || line.description || ""`. But `description` contains the entire invoice body (address + all items), not just the line-specific text. This fills the memo field with "115 E Oceanwatch Ct Nags Head N..." for every line.

**Fix**: Revert the memo loading to `memo: line.memo || ""` so the display stays clean. Instead, pass `line.description` as a separate matching-only signal to the auto-match logic. The auto-match effect will use `line.memo || line.description` for matching, but the memo field in the UI will only show `line.memo`.

**File**: `src/components/bills/EditExtractedBillDialog.tsx`
- Lines 231, 244, 254: Revert to `memo: line.memo || ""`
- Add a new field `matchingText` to the `LineItem` interface (used only for matching, not displayed)
- In the auto-match effect (~line 397): Use `line.matchingText || line.memo || ''` when calling `getBestPOLineMatch`

### Issue 2: Two PO Dropdowns on Line Item 1

**Problem**: When a PO has multiple line items (e.g., "Decks" and "Ground Floor"), the POSelectionDropdown shows a secondary line-level dropdown. The user sees this as "2 POs" and finds it confusing.

**Fix**: When the auto-match already selected a specific `purchase_order_line_id`, hide the secondary line dropdown. Only show it when the user manually selects a multi-line PO without a line pre-selected.

**File**: `src/components/bills/POSelectionDropdown.tsx`
- Line 128: Change the condition to also require that `purchaseOrderLineId` is NOT already set:
  ```
  const showLineDropdown = selectedPO && selectedPO.line_items.length > 1 && !purchaseOrderLineId;
  ```
  Actually that's wrong -- if they manually pick a PO they need the line dropdown. Better approach: always auto-select the best line when a PO is selected. The line dropdown is still useful but the initial auto-match already sets the line. The real issue is that line 128 shows the dropdown when a line IS selected. Let me just keep the dropdown but make the trigger show the selected line name instead of "Select line item", and collapse it visually. Actually the simplest fix: when `purchaseOrderLineId` is already set by auto-match, the dropdown already shows the selected line name -- the user just sees it as a second PO. Let me hide it entirely when auto-matched.

  Better approach: Don't show the line-level dropdown at all in the EditExtractedBill context. The auto-match already picks the best line. If the user wants to change it, they change the PO dropdown itself. This simplifies the UI.

  Simplest fix: Set `showLineDropdown = false` when `purchaseOrderLineId` is already set (auto-matched or not). The user can still change the PO header selection.

### Issue 3: Confidence Column Position and Header

**Problem**: The confidence badge appears BEFORE the Purchase Order column. User wants it AFTER, with a "Confidence" header.

**Fix in two files**:

**File**: `src/components/bills/EditExtractedBillDialog.tsx`
- Line 870: Add a "Confidence" table header AFTER the Purchase Order header
- Lines 919-938: Move the confidence display to its own TableCell AFTER the PO cell (instead of rendering inside POSelectionDropdown)

**File**: `src/components/bills/POSelectionDropdown.tsx`
- Line 144-145: Remove the `confidenceBadge` from inside the dropdown component (it will be rendered externally in the table)

### Summary of Changes

| File | Change |
|------|--------|
| `src/components/bills/EditExtractedBillDialog.tsx` | Revert memo to `line.memo \|\| ""`, add `matchingText` field, add Confidence header after PO, render confidence badge in its own cell |
| `src/components/bills/POSelectionDropdown.tsx` | Remove internal confidence badge rendering, hide line dropdown when line is already selected |

