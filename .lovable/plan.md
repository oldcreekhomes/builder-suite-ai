

# Synchronize "Enter with AI" Layout with "Review" Tab

## Overview
The "Enter with AI" (Extracted Bills) tab needs to match the "Review" tab layout exactly. Currently, the Extracted Bills table (`BatchBillReviewTable`) is missing several columns that exist in the Review tab, and the column order differs.

## Current Layout Comparison

### Enter with AI (BatchBillReviewTable) - Current
| Checkbox | Vendor | Reference # | Bill Date | Terms | Due Date | Cost Code | Total | File | Issues | Actions |

### Review Tab (BillsApprovalTable) - Target Layout
| Vendor | Cost Code | Bill Date | Due Date | Amount | Reference | Memo | Address | Files | Notes | PO Status | Actions |

## Required Changes to BatchBillReviewTable

### 1. Column Reordering and Additions
Change from current columns to match Review tab:
- Keep: Checkbox (prepend), Vendor, Cost Code, Bill Date, Due Date, Amount (rename from Total), Reference, File
- Add: Memo, Address, Notes, PO Status
- Remove: Terms, Issues (will be shown as badge/indicator instead)

### 2. New Column Order
| Checkbox | Vendor | Cost Code | Bill Date | Due Date | Amount | Reference | Memo | Address | Files | Notes | PO Status | Actions |

### 3. Detailed Changes to `src/components/bills/BatchBillReviewTable.tsx`

**Header Row Updates (lines ~476-503):**
- Reorder columns to: Checkbox, Vendor, Cost Code, Bill Date, Due Date, Amount, Reference, Memo, Address, Files, Notes (optional for extracted), PO Status (placeholder), Actions
- Remove "Terms" and "Issues" columns from header (terms can be shown elsewhere or in edit dialog; issues shown as badge on row)

**Data Row Updates (lines ~580-750):**
- Reorder cell rendering to match new header order
- Add Memo column: Display first line memo or combined memos
- Add Address column: Show lot assignment if available (from lines data), or "-" if not set
- Add PO Status column: Show "No PO" badge for now (PO matching not available for pending bills)
- Change "Total" to "Amount" for consistency

**Empty State Updates (lines ~431-467):**
- Update colSpan to match new column count

### 4. Manual Bill Entry - Address Column Already Exists
The manual bill entry form (ManualBillEntry.tsx) already includes the Address dropdown in the Job Cost tab. The user confirmed this works, so no changes needed there.

## Files to Modify

### `src/components/bills/BatchBillReviewTable.tsx`
1. Update header row to match Review tab column order:
   - Checkbox | Vendor | Cost Code | Bill Date | Due Date | Amount | Reference | Memo | Address | Files | PO Status | Actions
2. Update data row cells to match new order
3. Add Memo cell (extract from bill lines or extracted_data)
4. Add Address cell (placeholder or from lot assignment)
5. Add PO Status cell (show "No PO" badge as default for pending bills)
6. Remove Terms column (still editable in Edit dialog)
7. Remove Issues column (show as indicator/badge elsewhere)
8. Update empty state colSpan

## Column Mapping

| Review Tab | BatchBillReviewTable (New) | Data Source |
|------------|---------------------------|-------------|
| Vendor | Vendor | `extracted_data.vendor_name` |
| Cost Code | Cost Code | First line cost code name |
| Bill Date | Bill Date | `extracted_data.bill_date` |
| Due Date | Due Date | `extracted_data.due_date` or computed |
| Amount | Amount | Total from lines or extracted_data |
| Reference | Reference | `extracted_data.reference_number` |
| Memo | Memo (NEW) | First line memo or "-" |
| Address | Address (NEW) | Line lot assignment or "-" |
| Files | Files | File icon (existing) |
| Notes | Notes (NEW) | Show "Add" button or indicator |
| PO Status | PO Status (NEW) | "No PO" badge (pending bills can't match POs) |
| Actions | Actions | Edit/Delete buttons |

## Technical Notes
- The "Issues" column functionality will be preserved as a visual indicator (red vendor name, missing cost code badge, etc.) rather than a separate column
- Terms can still be viewed/edited in the Edit dialog
- PO Status will show "No PO" for all pending bills since they haven't been approved yet

