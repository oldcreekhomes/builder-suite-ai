# Fix "Unknown User / (no date)" in Bill Notes

## Problem
Legacy notes (saved before user-attribution was introduced) are stored as raw text with no `User | MM/DD/YYYY:` prefix. The `BillNotesDialog` therefore renders them as "Unknown User" with "(no date)".

The bill itself knows who created it (`bills.created_by`) and when (`bills.created_at`). We should use those as a fallback for legacy notes — exactly like `EditDescriptionDialog` already does for legacy memos.

## Changes

### 1. `src/components/bills/BillNotesDialog.tsx`
- Add an optional `billId?: string` prop.
- When the dialog opens with a `billId`, fetch `bills.created_by` + `bills.created_at`, then resolve the user's display name from `users` (first/last name, falling back to email).
- Store `legacyUserName` and `legacyDate` in state.
- In the "Previous notes" list, for any parsed note where `isLegacy` is true and `userName`/`date` are empty, render `legacyUserName` and `legacyDate` instead of "Unknown User" / "(no date)".

### 2. Pass `billId` from each caller
- `src/components/bills/BillsApprovalTable.tsx` (line 2163)
- `src/components/bills/EditBillDialog.tsx` (line 1382)
- `src/components/bills/EditExtractedBillDialog.tsx` (line 1679)
- `src/components/bills/ManualBillEntry.tsx` (line 1201) — pass only if a bill id exists (new manual entries won't have one, which is fine; there are no legacy notes in that case).

## Out of scope
- No DB migration. Stored note text is left untouched; only display is enriched.
- No change to `formatBillNote` or `parseBillNotes`.
