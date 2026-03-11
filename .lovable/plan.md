
Implementation plan to make pages 2–6 match page 1’s header/footer exactly:

1) Lock one shared print “chrome” (header + footer) and reuse it on every page
- Replace per-page inline header/footer variations with one shared template function and one shared CSS class set.
- Keep page-specific subtitle text (ARTICLES, EXHIBIT A, etc.) but force the exact same typography, spacing, underline, and separator line as page 1.
- Ensure there is only one separator line in the header and one thin line in the footer.

2) Make footer placement identical to page 1 on all pages
- Refactor page container to a fixed printable frame (letter layout content area) so footer always sits at the same bottom Y-position.
- Use a consistent page layout structure for all 6 pages:
  - Header block
  - Content block (reserved space)
  - Footer block anchored at bottom of page frame
- Remove any page-specific spacing/border overrides that can lift the footer on some pages.

3) Normalize print rendering timing so typography is consistent across pages
- Keep `document.fonts.ready`, then add a short render tick before `print()` so all pages render with the same font metrics.
- This prevents pages 2–6 from showing smaller/different-looking header text due to race conditions.

4) Align page model consistency (important cleanup)
- Update the on-screen page count model to match print output (6 pages) so navigation and print structure stay in sync.
- Add the missing on-screen page state for “Exhibit A (continued)” to mirror the printed document structure.

5) Verify against your exact acceptance criteria
- Page 1 remains unchanged.
- Pages 2, 3, 4, 5, 6 use the exact same header/footer style system as page 1.
- Footer is moved down to the same baseline on every page.
- Output must read: Page 1 of 6 … Page 6 of 6.

Technical details
- File to update: `src/components/templates/SubcontractorContractForm.tsx`
- Primary refactor area: `handlePrint` helpers (`generatePrintHeader`, `makeFooter`, `makePage`, print CSS block)
- Secondary alignment: on-screen pagination constants/render blocks to reflect 6-page structure.
