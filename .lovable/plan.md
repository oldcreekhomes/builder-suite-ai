
## Make the bid package header 6 equal columns

### What I’ll change
Reset the top management header in `BidPackageDetailsModal` to a simple 6-column equal grid so these all get the same width:
- Status
- Due Date
- Reminder
- Specs
- Files
- Actions

### Implementation
**File: `src/components/bidding/BidPackageDetailsModal.tsx`**

1. Replace the current uneven grid:
   `grid-cols-[1fr_1fr_1fr_auto_auto_auto]`
   with a true equal-width layout:
   `grid-cols-6`

2. Standardize all 6 column wrappers so they use the same structure:
   - label on top
   - control area below
   - `min-w-0` on each column so nothing pushes the layout unevenly

3. Remove the special outer centering treatment on `Specs` and `Actions` so they follow the same spacing pattern as the first 3 fields.

4. Wrap `Specs`, `Files`, and `Actions` in the same control-height container used visually by the other fields (`h-9 flex items-center ...`) so they align cleanly and stop looking bolted onto the right side.

5. Keep all existing behavior exactly the same:
   - specs modal still opens the same way
   - files still upload/link/delete the same way
   - actions menu still works the same way

### Technical details
- Layout-only change
- No bidding logic changes
- No company table changes
- No send-date/status changes
- No separate toolbar / custom grid experiments
- Goal: a clean, even 6-column header with no “special” right-side columns

### Files affected
- `src/components/bidding/BidPackageDetailsModal.tsx`
