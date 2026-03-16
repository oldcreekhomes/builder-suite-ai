
Goal: restore the printed footer exactly as requested, keep the existing printed header, and stop Exhibit A content from falling into the footer area.

Plan

1. Restore the custom print footer
- Re-add a `makeFooter(pageNum, totalPages, printedAt)` helper in `src/components/templates/SubcontractorContractForm.tsx`.
- Footer layout:
  - left: print date
  - center: print time
  - right: `Page X of Y`
- Add a top border line so it visually matches the header.

2. Keep the printed header as-is
- Leave `generatePrintHeader(subtitle)` in place for printed pages.
- Do not change the on-screen page header logic.

3. Prevent body content from overlapping the footer
- Update `makePage(...)` so each printed page has a true header/content/footer structure instead of just stacking content in a fixed-height box.
- Reserve dedicated bottom space for the footer, so text can never run into it again.
- Keep `@page { margin: 0; }` so browser-added print chrome stays suppressed while using the app’s own footer.

4. Fix Exhibit A pagination so “H. Storm Drain” starts on the next page
- Replace the current simple raw-line chunking for `scopeOfWork` with section-aware pagination.
- Split Exhibit A by major section headers (`A.`, `B.`, `C.`, etc.), then place whole sections on a page when possible.
- If the next section would collide with the footer area, move that entire section to the next page.
- This ensures `H. Storm Drain` does not begin inside the footer region and avoids similar issues for later sections.

5. Recalculate total page count before rendering
- Since Exhibit A page breaks may change, compute all pages first, then render footers using the final total page count.

Technical details
- File to update: `src/components/templates/SubcontractorContractForm.tsx`
- Main areas to change:
  - reintroduce `makeFooter(...)`
  - update `makePage(...)` to include header + content area + footer
  - capture a single print timestamp at the start of `handlePrint()`
  - replace `LINES_PER_PAGE` chunking with section-aware Exhibit A pagination
- Expected result:
  - header stays
  - footer comes back with date / time / page count
  - line above footer returns
  - Storm Drain moves to the next page instead of printing into the footer
