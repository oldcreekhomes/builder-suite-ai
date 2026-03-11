

## Plan: Fix Print Footer Positioning, Content Overflow, and Section Headers

### Problems from the PDF
1. **Footer is ~3 inches up the page** — Using `position: absolute` inside a `min-height: 9.5in` div. When content exceeds that height (like Exhibit A), the footer floats in the middle of the page instead of at the bottom.
2. **Section J overflows into the footer** — The scope of work is one big block; when it's too long for one page, the browser flows it to the next page but the footer stays mid-page.
3. **Section headers A-K are not differentiated** — Need bold, all-caps formatting.

### Solution

**1. Replace per-page absolute footers with a single `position: fixed` print footer**
- In print CSS, `position: fixed` repeats on every printed page automatically
- Use CSS `counter(page)` and `counter(pages)` for automatic page numbering (works in Chrome print)
- Remove all the manually injected `<div class="page-footer">` from each page
- Add one global footer div with date (left), time (center), `Page counter(page) of counter(pages)` (right)
- Add `padding-bottom: 0.6in` to page content so text never overlaps the footer

**2. Remove fixed `min-height` from page-content divs**
- Remove `min-height: 9.5in` — let content flow naturally
- Keep `page-break-before: always` on page boundaries so each section starts on a new page
- The browser will automatically paginate long content (like Exhibit A) across pages, and the fixed footer will appear at the bottom of every physical page

**3. Make scope of work section headers bold and uppercase in print**
- Parse the `scopeOfWork` text and wrap lines matching `^[A-K]\.` pattern in `<strong style="text-transform: uppercase">` tags
- Apply same styling on-screen in the Textarea display (on-screen it's editable so just the print rendering matters)

**4. On-screen: make section headers bold in the Exhibit A display**
- When displaying (not editing), render A-K headers in bold/uppercase

### Files Modified
- `src/components/templates/SubcontractorContractForm.tsx` — footer restructure, content overflow fix, bold headers

