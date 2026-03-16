
Goal: make the printed document match the older “body-only” look by removing the new app-added print header/footer that is showing up on every page.

What I found
- The extra top content is coming from the app’s print HTML, not from the form itself:
  - `generatePrintHeader()` adds:
    - `SUBCONTRACTOR AGREEMENT`
    - section subtitle like `CONTRACT SUMMARY`
- The extra bottom content is also app-added:
  - `makeFooter()` adds `Page X of Y`
- These are injected in `src/components/templates/SubcontractorContractForm.tsx` inside `handlePrint()`.
- The browser-generated items such as date/time and `about:blank` / title / browser page numbering are separate from the app content. They typically come from the browser print dialog’s “Headers and footers” option, not from React/CSS.

Implementation plan
1. Remove the custom print header entirely
- Delete use of `generatePrintHeader()` from printed pages.
- Stop rendering:
  - `SUBCONTRACTOR AGREEMENT`
  - per-page section subtitle in the top header area

2. Remove the custom print footer entirely
- Delete `makeFooter()` from printed pages.
- Stop rendering:
  - `Page X of Y`
  - footer border/top rule

3. Keep only document body content on each printed page
- Keep the fixed 8.5x11 page containers so content still prints in page-sized sections.
- Adjust page padding so content starts near the top and ends above the page edge without reserved header/footer space.

4. Preserve section labels as normal body content only where needed
- If section titles like `CONTRACT SUMMARY`, `ARTICLES`, `EXHIBIT A – SCOPE OF WORK`, etc. must remain, render them as the first line of page content rather than as a separate print header block.
- This keeps the document readable without reintroducing the header bar the user wants removed.

5. Rebalance pagination after header/footer removal
- Because removing header/footer frees vertical space, re-tune the Scope of Work split so more lines fit naturally on each page.
- This should reduce the premature breaks the user complained about around items like G and K.

Technical details
- File to update: `src/components/templates/SubcontractorContractForm.tsx`
- Main changes will be inside `handlePrint()`:
  - remove `generatePrintHeader()`
  - remove `makeFooter()`
  - simplify `makePage()`
  - reduce top/bottom padding reserved for header/footer
  - re-tune `LINES_PER_PAGE` after the extra chrome is removed

Important constraint
- If the red markup also includes browser-added date/time and `about:blank` outside the app content, that part cannot be reliably removed by app code alone. The code fix will remove the app-generated header/footer; browser-added print decorations still need the browser print dialog option for headers/footers turned off.

Expected result
- No app-added title block at the top of printed pages
- No app-added `Page X of Y` at the bottom
- More usable vertical space for Scope of Work content
- Printed output closer to a plain Word-style document body
