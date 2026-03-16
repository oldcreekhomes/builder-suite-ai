

## Plan: Flowing Print Layout with Page Numbers

### Problem
The Scope of Work content overflows the fixed 11in page container, breaking footers. Hardcoding split points (at section I, H, etc.) is fragile because content length varies.

### Solution
Replace the fixed-container page system with a **flowing CSS layout** that uses `position: fixed` for repeating headers/footers and CSS `counter(page)` / `counter(pages)` for page numbering.

### Changes — `src/components/templates/SubcontractorContractForm.tsx`

**1. Replace `makePage` / `makeFooter` with a flowing document structure:**

- **Fixed header** (`position: fixed; top: 0`): "SUBCONTRACTOR AGREEMENT" — repeats on every printed page automatically
- **Fixed footer** (`position: fixed; bottom: 0`): Date, time, and `Page counter(page) of counter(pages)` via CSS `content` — repeats on every printed page automatically
- **`@page` margin**: Set top/bottom margins (~0.9in/0.7in) to leave room for the fixed header and footer so content doesn't overlap them

**2. Section structure becomes flowing content with page breaks:**

Each major section gets `page-break-before: always` as an inline heading within the flow:
- CONTRACT SUMMARY (no break — first page)
- ARTICLES (`page-break-before: always`)
- ARTICLES (CONTINUED) (`page-break-before: always`)
- EXHIBIT A – SCOPE OF WORK (`page-break-before: always`) — **flows naturally across as many pages as needed**
- EXHIBIT B – PROJECT DRAWINGS (`page-break-before: always`)
- SIGNATURES (`page-break-before: always`)

**3. Remove the hardcoded scope split logic** — delete the `splitIndex`, `page4Scope`, `page5Scope` variables. The entire scope of work is one `<div>` that flows naturally.

**4. Page numbering via CSS counters:**

```css
@page { margin: 0.9in 0.75in 0.8in 0.75in; size: letter; }

.print-footer::after {
  content: "Page " counter(page) " of " counter(pages);
}
```

This gives accurate "Page X of Y" on every page regardless of how many pages the scope of work spans. Supported in Chrome, Edge, and Safari print.

**5. Footer layout** — The fixed footer will contain three inline elements: date (left), time (center), and a `::after` pseudo-element for page count (right). Since CSS `counter(page)` only works in `content` property, the page number must be in a pseudo-element.

### What stays the same
- On-screen UI: 6 pages, unchanged
- `TOTAL_PAGES = 6` for on-screen navigation: unchanged
- All content, formatting, fonts: unchanged
- Header text: "SUBCONTRACTOR AGREEMENT" (already corrected)

### File
- `src/components/templates/SubcontractorContractForm.tsx` — rewrite the `handlePrint` callback's HTML generation

