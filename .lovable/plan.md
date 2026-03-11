

## Plan: Fix Print Footer, Suppress Browser Chrome, and Handle Exhibit A Overflow

### Problems from the PDF
1. **Browser header reappeared**: "3/11/26, 5:44 PM, Subcontract Agreement" at top of every page — caused by `@page { margin: 0.5in 0.75in }` which leaves room for browser-injected headers
2. **Browser footer reappeared**: "about:blank 5/6" at bottom — same cause
3. **Custom footer floating mid-page**: The date/time/page div is not at the actual page bottom
4. **Page 4 has no header**: When Exhibit A overflows to a second page, there is no "SUBCONTRACT AGREEMENT / EXHIBIT A – SCOPE OF WORK" header on the continuation page
5. **Section K bleeds into footer area**: No padding to prevent content from overlapping the footer

### Solution

**1. Suppress browser headers/footers — use `@page { margin: 0 }`**
- Change from `@page { margin: 0.5in 0.75in }` to `@page { margin: 0; size: letter; }`
- Use `body { margin: 0.5in 0.75in 0.8in 0.75in; }` for content margins instead (extra bottom margin for footer)
- This is the exact pattern the Budget print uses (`@page { margin: 0; size: auto; }`)

**2. Fix the custom footer positioning**
- Keep single `position: fixed; bottom: 0; left: 0; right: 0` footer div
- Add explicit `padding: 4px 0.75in` so footer text aligns with content margins
- Date (left), Time (center), Page number (right) in black
- Use CSS `counter(page)` for automatic page numbering (same as Budget's `.print-page-counter::before { content: counter(page); }`)

**3. Handle Exhibit A overflow with repeating header**
- Wrap Exhibit A content in a `<table>` with the page header ("SUBCONTRACT AGREEMENT / EXHIBIT A – SCOPE OF WORK") inside a `<thead>` element
- Use `thead { display: table-header-group; }` so the header automatically repeats on every continuation page when content overflows
- This ensures page 4 (continuation) gets the proper header

**4. Prevent content from bleeding into footer**
- `body` bottom margin of 0.8in ensures content stops before the fixed footer
- Add `break-inside: avoid` on each scope section (A-K blocks) so individual sections don't split across pages

### Files Modified
- `src/components/templates/SubcontractorContractForm.tsx` — print CSS and Exhibit A rendering in `handlePrint`

