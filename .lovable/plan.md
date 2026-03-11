

## Plan: Move Footer Down and Verify Header Consistency

### Issue 1: Footer Position
The footer is positioned too high on every page. The page container uses `min-height: 9.5in`, but with `@page { margin: 0 }` and `body { padding: 0.5in 0.75in }`, the available content height is **10in** (11in letter - 0.5in top - 0.5in bottom). The footer sits at 9.5in instead of 10in, leaving ~0.5in of dead space below it.

**Fix:** Change `min-height: 9.5in` to `min-height: 10in` in the `makePage` function (line 264). This pushes the absolutely-positioned footer to the true bottom of each physical page.

### Issue 2: Header Consistency
The code already uses the same `generatePrintHeader()` function for all 6 pages, so the HTML is identical. However, the Montserrat font is loaded via an external Google Fonts link. If the font hasn't finished loading when the browser renders pages 2+, the fallback sans-serif may render at a slightly different visual size.

**Fix:** Add a font-load wait before calling `printWindow.print()`. Use `printWindow.document.fonts.ready.then(() => printWindow.print())` to ensure Montserrat is fully loaded before rendering all pages. This guarantees every header renders identically.

### Files Modified
- `src/components/templates/SubcontractorContractForm.tsx` -- two changes:
  1. Line 264: `min-height: 9.5in` to `min-height: 10in`
  2. Lines 328-329: Replace `printWindow.print()` with `printWindow.document.fonts.ready.then(() => printWindow.print())`

