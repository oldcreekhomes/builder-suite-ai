

## Plan: Revert to page-based print system with proper Page X of Y

### Problem
The CSS `counter(page)` / `counter(pages)` approach does not work — it renders "Page 0 of 0" on every page. The flowing layout also lost the per-page section subtitles from the header (e.g., "CONTRACT SUMMARY", "ARTICLES").

### Solution
Revert the print system back to the **`makePage` approach** with explicit page containers, absolute-positioned footers with real "Page X of Y" text, and per-page headers with section subtitles. For the Exhibit A overflow problem, split the scope of work by **line count** (approximately 45 lines per page) rather than by section letter. This handles variable-length content reliably.

### Changes — `src/components/templates/SubcontractorContractForm.tsx`

1. **Restore `makePage` and `makeFooter` helper functions** that create fixed-height `11in` page containers with:
   - Header: "SUBCONTRACTOR AGREEMENT" + section subtitle
   - Footer: date, time, "Page X of Y" (hardcoded numbers)
   - Content area between them

2. **Split Exhibit A by line count**: Take the `scopeOfWork` text, split by `\n`, and chunk into groups of ~45 lines. Each chunk becomes its own page using `makePage`. First chunk gets title "EXHIBIT A – SCOPE OF WORK", subsequent chunks get "EXHIBIT A – SCOPE OF WORK (CONTINUED)".

3. **Calculate `totalPages` dynamically**: `3 + scopePageCount + 2` (Contract Summary + Articles×2 + Scope pages + Exhibit B + Signatures). Use this for "Page X of Y" in each footer.

4. **Remove all CSS counter/fixed-position print code** — the `@page`, `.print-header`, `.print-footer`, `.header-spacer`, `.footer-spacer`, `.section-break` styles and elements.

5. **Keep everything else identical** — on-screen UI stays 6 pages, header text stays "SUBCONTRACTOR AGREEMENT", all content unchanged.

### File
- `src/components/templates/SubcontractorContractForm.tsx`

