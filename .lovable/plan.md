

## Plan: Fix Print Output — Remove Extra Metadata & Use More Page Space

### Problems from the PDF
1. **Footer shows date and time** — remove them, keep only "Page X of Y"
2. **"about:blank" in browser title bar** — set a proper `<title>` so it doesn't show "about:blank"
3. **Scope pages break too early** — 45 lines per page wastes significant space. G. Sanitary ends near the bottom but the items underneath get pushed to the next page. Same issue with K. Asphalt. Need to fit more lines per page.

### Changes — `src/components/templates/SubcontractorContractForm.tsx`

**1. Remove date/time from footer, keep only page number:**
```tsx
const makeFooter = (pageNum: number) => `
  <div style="position: absolute; bottom: 0.4in; left: 0.75in; right: 0.75in; 
       text-align: right; font-size: 8px; color: #000; 
       border-top: 0.5px solid #ccc; padding-top: 4px;">
    Page ${pageNum} of ${totalPages}
  </div>
`;
```

**2. Set a proper document title** to avoid "about:blank":
Change the `<title>` tag from `" "` to something like `"Subcontractor Agreement"`.

**3. Increase lines per page from 45 to 65:**
The current `LINES_PER_PAGE = 45` wastes ~30% of each page. Increasing to 65 will fill pages properly before breaking to the next one — matching Word-like behavior where content flows to the footer area before continuing.

### File
- `src/components/templates/SubcontractorContractForm.tsx` (lines 282–302, 355)

