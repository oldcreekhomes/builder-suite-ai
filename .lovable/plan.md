

## Plan: Fix consistent headers and footers across all printed pages

### Problem
The current print system creates one `<div>` per logical section (6 divs for 6 pages), each with its own header and footer. When content (especially Articles on page 2) exceeds the physical page height, CSS print breaks the div across multiple printed pages -- but the overflow pages have no header or footer. This causes:

- Page 2 (Articles): No footer at bottom, content overflows to page 3
- Page 3: Shows only Article 15 spillover with a misplaced "Page 2 of 6" footer, no header
- Inconsistent header positioning on pages after page 1

### Solution
Split the Articles content across two logical pages (page 2 and page 3) so it never overflows, then renumber all subsequent pages. This keeps the existing `makePage` architecture intact while ensuring every physical page has a proper header and footer.

### Changes -- single file: `src/components/templates/SubcontractorContractForm.tsx`

1. **Increase total page count from 6 to 7** since Articles now spans two pages.

2. **Split articles into two groups** using a helper that divides the 15 articles roughly in half (e.g., Articles 1-8 on page 2, Articles 9-15 on page 3). The split point should be chosen so neither half exceeds the printable area (~8.5 inches of content height).

3. **Update `makePage` calls**:
   - Page 1: CONTRACT SUMMARY (unchanged)
   - Page 2: ARTICLES (first half, ~Articles 1-8)
   - Page 3: ARTICLES (CONTINUED) (second half, ~Articles 9-15)
   - Page 4: EXHIBIT A -- SCOPE OF WORK (A-F)
   - Page 5: EXHIBIT A -- SCOPE OF WORK (CONTINUED) (G-K)
   - Page 6: EXHIBIT B -- PROJECT DRAWINGS
   - Page 7: SIGNATURES

4. **Update `TOTAL_PAGES` constant** from 6 to 7 for on-screen pagination as well.

5. **Update the on-screen rendering** to add a new page for the articles continuation, matching the print layout.

This approach mirrors how Exhibit A is already split across two pages (A-F and G-K), using the same proven pattern. Every physical printed page will have the identical header (SUBCONTRACT AGREEMENT + subtitle) and footer (date, time, page X of 7) matching page 1's formatting exactly.

