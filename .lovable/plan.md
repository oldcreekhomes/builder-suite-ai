

## Plan: Fix header/footer positioning on printed pages 2-7

### Problem
The body-level padding (`padding: 0.5in 0.75in`) only applies to the first physical page. When pages 2-7 start on new physical pages via `page-break-before: always`, they inherit no top/bottom padding from the body, causing headers to sit too high and footers too high on the page.

### Root Cause
Line 322: `<body style="padding: 0.5in 0.75in;">` — this padding only affects the document flow on page 1. CSS page breaks don't re-apply body padding to subsequent pages.

### Fix (single file: `SubcontractorContractForm.tsx`)

1. **Remove body padding** — change `padding: 0.5in 0.75in` to `padding: 0` on the `<body>` tag.

2. **Add per-page padding to `makePage`** — update each page div to include `padding: 0.5in 0.75in` directly, so every physical page gets identical margins regardless of page breaks.

3. **Adjust footer positioning** — since each page div now has its own padding, the footer's `position: absolute; bottom: 0` will sit at the bottom of the padded page container. Update the footer to use `bottom: 0.5in` (or incorporate it into the page padding) so it matches the Contract Summary page's footer position exactly.

The updated `makePage` will look like:
```
padding: 0.5in 0.75in; min-height: 11in; position: relative; box-sizing: border-box;
```

This ensures every page — including pages triggered by `page-break-before: always` — has identical top, bottom, left, and right margins matching Page 1 exactly.

