

## Plan: Fix Page 1 Header Order, Remove Border, and Adopt Budget Print Layout

### Issues Identified from the PDF
1. Header order is wrong: "CONTRACT SUMMARY" is bold/underlined, "SUBCONTRACT AGREEMENT" is subtitle — needs to be flipped
2. Print output duplicates Page 1 content (the `hidden print:block` section renders alongside the visible page)
3. Print shows "lovable.dev" URL and date/time headers from browser chrome — need the `window.open` approach like budget
4. Huge spacing on printed output
5. Outer border on the container not needed

### Changes to `SubcontractorContractForm.tsx`

**1. Flip header titles** (line 193-196):
- "SUBCONTRACT AGREEMENT" → bold, underlined, primary heading
- "CONTRACT SUMMARY" → light gray subtitle below it

**2. Remove outer border** (line 321):
- Remove `border rounded-lg shadow-sm` from the container div

**3. Replace CSS `@media print` approach with `window.open` print method** (matching budget pattern):
- Remove the `hidden print:block` section entirely (lines 345-359)
- Add a `handlePrint` function that opens a new window, writes all pages as HTML with inline styles (like `BudgetTable.tsx` does), and calls `window.print()`
- Add a Print button to the page nav toolbar
- This eliminates the lovable.dev URL footer, browser date header, and duplicate content issues

**4. Print layout structure** (in the new print window):
- Use Montserrat font, 0.5in margins, 11px base font size (matching budget)
- Page 1: CONTRACT SUMMARY header + all party blocks + line items table
- Pages 2-3: Articles
- Page 4: Signatures
- Page 5: Exhibits
- Use `page-break-before: always` for pages 2-5

### Files Modified
- `SubcontractorContractForm.tsx` only

