
# Add "Sent On" Date Column to Bidding Tables

## Summary
Add a new "Sent On" column to track when bid packages were first sent to subcontractors. This column will appear between Status and Due Date in both the main bidding table and the bid package details modal.

## Changes Overview

### 1. Database Migration
Add a new `sent_on` column to the `project_bid_packages` table:
- Column: `sent_on` (type: `timestamptz`, nullable)
- This will record the timestamp when the bid package was first sent

### 2. Update TypeScript Types
Update `src/integrations/supabase/types.ts` to include the new `sent_on` field in:
- `Row` type (for reading)
- `Insert` type (for creating)
- `Update` type (for updating)

### 3. Update Data Hook Interface
Update `src/hooks/useBiddingData.ts`:
- Add `sent_on: string | null` to the `BiddingPackage` interface

### 4. Update Table Header
Update `src/components/bidding/BiddingTableHeader.tsx`:
- Add "Sent On" column header between Status and Due Date

New column order: Checkbox | Cost Code | Status | **Sent On** | Due Date | Reminder Date | Specifications | Files | Actions

### 5. Update Table Row Content
Update `src/components/bidding/components/BiddingTableRowContent.tsx`:
- Add a new TableCell to display the `sent_on` date
- Display formatted date (e.g., "01/15/2026") or placeholder "mm/dd/yyyy" if not sent
- Position between Status and Due Date columns

### 6. Update Bid Package Details Modal
Update `src/components/bidding/BidPackageDetailsModal.tsx`:
- Add "Sent On" column to the bid package management table header
- Add corresponding cell displaying the sent_on date
- Position between Status and Due Date

### 7. Update Send Logic - SendBidPackageModal
Update `src/components/bidding/SendBidPackageModal.tsx`:
- When successfully sending a bid package, also set `sent_on` to the current timestamp
- Only update `sent_on` if it's not already set (preserve first send date)

### 8. Update Send Logic - SendSingleCompanyEmailModal
Update `src/components/bidding/SendSingleCompanyEmailModal.tsx`:
- When successfully sending to a single company, update `sent_on` if not already set
- This handles cases where the first email is sent to individual companies

## Technical Details

### Database Migration SQL
```sql
ALTER TABLE project_bid_packages 
ADD COLUMN sent_on timestamptz DEFAULT NULL;
```

### Date Display Format
The sent_on date will be displayed in `mm/dd/yyyy` format using the date-fns `format` function, consistent with existing date displays (Due Date, Reminder Date).

### Visual Layout
The new column will be read-only (no date picker) since it's automatically set when sending. It will use the same styling and width as the Due Date column for consistency.

### Conditional Logic
- When status changes to "sent" via the send modal, `sent_on` is set to current timestamp
- If `sent_on` already has a value, it is not overwritten (preserves first send date)
- The column displays "mm/dd/yyyy" placeholder when empty

## Files to Modify
1. `supabase/migrations/[timestamp]_add_sent_on_to_bid_packages.sql` (new)
2. `src/integrations/supabase/types.ts`
3. `src/hooks/useBiddingData.ts`
4. `src/components/bidding/BiddingTableHeader.tsx`
5. `src/components/bidding/components/BiddingTableRowContent.tsx`
6. `src/components/bidding/BidPackageDetailsModal.tsx`
7. `src/components/bidding/SendBidPackageModal.tsx`
8. `src/components/bidding/SendSingleCompanyEmailModal.tsx`
