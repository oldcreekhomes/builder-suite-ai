

## Plan: Fix Print Footer on Pages 4-5 and Update Header Text

### Problems Identified
1. **Footer broken on Exhibit A (Page 4)**: The Scope of Work content is too long for one physical page. It overflows onto a second printed page that has no header or footer. The footer on page 4 also overlaps with the last lines of content because it uses `position: absolute; bottom`.
2. **Header text wrong**: All pages say "SUBCONTRACT AGREEMENT" -- should be "SUBCONTRACTOR AGREEMENT".

### Root Cause
The print layout uses `position: absolute; bottom: 0.5in` for footers inside a `min-height: 11in` container. When content exceeds 11in (as it does for the full scope of work), the content overflows but the footer stays pinned to the first page's bottom, overlapping content. The overflow page gets no header or footer.

### Solution

**File: `src/components/templates/SubcontractorContractForm.tsx`**

1. **Split Exhibit A across two print pages** (pages 4 and 5), making the document 7 printed pages total:
   - Page 4: "EXHIBIT A -- SCOPE OF WORK" with sections A through H
   - Page 5: "EXHIBIT A -- SCOPE OF WORK (CONTINUED)" with sections I through L
   - Page 6: Exhibit B (renumbered from 5)
   - Page 7: Signatures (renumbered from 6)
   - Update `totalPages` from 6 to 7

   The split point will be determined by finding section "I." in the scope text. Content before "I." goes on page 4, the rest on page 5. This keeps each page's content well within the physical page height so the absolute-positioned footer works correctly.

2. **Rename header** from "SUBCONTRACT AGREEMENT" to "SUBCONTRACTOR AGREEMENT" in both:
   - `generatePrintHeader` (print output, ~line 237)
   - `renderPageHeader` (on-screen UI, ~line 388)

3. **On-screen `TOTAL_PAGES` stays at 6** (the split is print-only; the user edits the full scope on one screen page). Only the print `totalPages` variable changes to 7.

### Why This Approach
Rather than trying to make CSS handle arbitrary overflow with repeated headers/footers (which `window.open` print doesn't support natively), splitting the content at a known section boundary is reliable and matches the document's natural structure. The scope sections A-H and I-L are a clean split point that keeps both pages well under the 11in limit.

