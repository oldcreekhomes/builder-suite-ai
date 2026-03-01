
## Clean Up Manage Bills Tabs for Consistency

### Problem
The Manage Bills page has several UI inconsistencies across its tabs:
1. **Duplicate search bars**: The Review, Rejected, Approved, and Paid tabs all render an inline search bar above the table AND emit one to the header -- resulting in two visible search bars.
2. **Enter with AI tab**: Has redundant content -- both the upload button and an "Extracted Bills" card with its own "Upload PDF files above" messaging, when these should be consolidated into one clean area aligned with the top of the sidebar (like other pages).

### Changes

**1. Remove duplicate inline search bars from Review, Rejected, Approved, and Paid tabs**

In `src/components/bills/BillsApprovalTabs.tsx`:
- **Review tab (lines 811-821)**: Remove the inline search `<div className="mb-4">` block containing the `<Input>` search bar.
- **Rejected tab (lines 835-845)**: Remove the same inline search block.
- **Approved tab (lines 860-907)**: Remove the inline search + date filter block. Move the date filter controls (RadioGroup with "Due on or before" / "Show all bills") into the header action instead -- append them alongside the search input in the `useEffect` that emits header actions for the `approve` tab.
- **Paid tab (lines 921-931)**: Remove the inline search block.

**2. Move Approved tab's date filter into header**

In the `useEffect` (line 691) that emits header actions, update the `activeTab === 'approve'` branch to include the date filter RadioGroup, Calendar Popover, and search input all within the header action slot. This consolidates the controls into one location.

**3. Consolidate "Enter with AI" tab content**

In `src/components/bills/BillsApprovalTabs.tsx` (lines 743-807):
- Move the `<SimplifiedAIBillExtraction>` upload button into the header action slot (emit it via `onHeaderActionChange` when `activeTab === 'upload'`).
- Remove the redundant "Extracted Bills" card with its duplicate "Upload PDF files above" messaging when no bills exist. Replace with a simple centered empty state (no card wrapper, just centered text).
- When bills ARE present, keep the `BatchBillReviewTable` but remove the Card wrapper's header that says "Extracted Bills" with yet another description -- the content should start flush at the top aligned with the sidebar, matching other pages.

### Technical Details

**Header action emission updates** (`useEffect` at line 691):
- `upload` tab: Emit `<SimplifiedAIBillExtraction ... />` as a header action (it already renders as a small "Upload PDFs" button).
- `approve` tab: Emit search input + date filter RadioGroup/Calendar inline in the header.
- `review`, `rejected`, `pay` tabs: Already emit search correctly -- no changes needed there.

**Inline content removal**:
- Lines 811-821 (review inline search): Delete
- Lines 835-845 (rejected inline search): Delete
- Lines 860-907 (approved inline search + date filter): Delete, move date filter to header
- Lines 921-931 (paid inline search): Delete

**Upload tab restructure** (lines 743-807):
- Remove `<SimplifiedAIBillExtraction>` from inline content
- Emit it via header action when `activeTab === 'upload'`
- Simplify empty state: remove Card/CardHeader/CardContent wrapper, use a simple centered message
- When bills exist: keep the submit button + `BatchBillReviewTable` but remove the outer Card wrapper to align flush with content area

### Result
- Each tab has exactly one search bar (in the header)
- The Approved tab's date filter lives in the header alongside the search
- The "Enter with AI" tab has the Upload PDFs button in the header and clean content below
- All tabs match the standardized layout used across the rest of the application
