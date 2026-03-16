

## Plan: Remove redundant Page 5 (Scope of Work Continued)

### Problem
Page 4 already has a full editable textarea containing the entire Scope of Work (sections A through L). Page 5 is a **read-only, non-editable** duplicate that displays sections G onward from the same field. This is confusing and serves no purpose.

### Changes — `src/components/templates/SubcontractorContractForm.tsx`

1. **Change `TOTAL_PAGES` from 7 to 6** (line 39)

2. **Remove the print page 5** (lines 358-359, 385):
   - Delete `page5Content` variable
   - Remove `makePage(5, ...)` from the print HTML
   - Renumber print pages: Exhibit B becomes page 5, Signatures becomes page 6
   - Update `totalPages` in footer from 7 to 6

3. **Remove the on-screen page 5 block** (lines 625-639):
   - Delete the entire `{currentPage === 5 && ...}` section

4. **Renumber on-screen pages 6 and 7**:
   - `currentPage === 6` (Exhibit B) → `currentPage === 5`
   - `currentPage === 7` (Signatures) → `currentPage === 6`

Result: A clean 6-page document where page 4 has the full editable Scope of Work, page 5 is Exhibit B, and page 6 is Signatures.

