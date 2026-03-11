

## Plan: Fix Print Headers, Footer, and Page Numbering

### Problems from PDF
1. **Footer has huge black line** — `border-top: 1px solid #000` is too heavy
2. **Page numbers show "Page 0"** — CSS `counter(page)` doesn't work reliably in `window.open` print contexts
3. **Headers on pages 2-5 don't match page 1** — Exhibit A uses a `<table><thead>` which renders differently; other pages may have font loading issues
4. **Exhibit A has two black lines** in its header — one from the thead border, one from the header div border

### Solution

**Abandon the `position: fixed` footer and `table/thead` approach entirely.** Go back to per-page divs with manually placed footers and headers — the only approach that gives full control.

**1. Per-page div structure with absolute footer**
- Each page: `min-height: 9.5in; position: relative; page-break-after: always; box-sizing: border-box`
- Footer inside each page: `position: absolute; bottom: 0; left: 0; right: 0`
- Footer border: thin `border-top: 0.5px solid #ccc` (subtle, not a thick black line)
- Footer text: Date (left), Time (center), "Page X of 6" (right) — manually set per page

**2. Split Exhibit A across two pages to prevent overflow**
- Page 3: Sections A through F (with header "EXHIBIT A – SCOPE OF WORK")
- Page 4: Sections G through K (with same header repeated — "EXHIBIT A – SCOPE OF WORK (CONTINUED)")
- This eliminates the need for the table/thead hack entirely
- Total pages becomes 6: Contract Summary, Articles, Exhibit A (1), Exhibit A (2), Project Drawings, Signatures

**3. All headers identical to page 1**
- Every page uses the exact same `generatePrintHeader()` function
- Remove the table/thead wrapper from Exhibit A — use plain divs like all other pages
- Same font size (16px bold underlined title, 10px gray subtitle), same single black bottom border

**4. Remove the global fixed footer div**
- Delete the `<div class="print-footer">` that sits outside page divs
- Delete the `.print-footer` CSS rules
- Each page has its own footer div with explicit "Page N of 6" text

### Files Modified
- `src/components/templates/SubcontractorContractForm.tsx` — rewrite print rendering in `handlePrint`

