

## Plan: Fix Print Output to Match Budget Template Format

### Issues Identified from the PDF
1. **Browser header**: "3/11/26, 5:12 PM" and "Subcontract Agreement" printed at top of each page by the browser — needs to be suppressed
2. **Browser footer**: "about:blank" and "1/6" page counter — wrong format. Should match budget: date (left), time (center), page number (right)
3. **Page 3 subtitle**: Says "EXHIBITS" — should say "EXHIBIT A – SCOPE OF WORK"
4. **Page 4 subtitle**: Says "EXHIBITS" — should say "EXHIBIT B – PROJECT DRAWINGS"
5. **Page 5 (Exhibit C)**: Delete entirely — reduce to 5 pages total
6. On-screen pages 3 and 4 subtitles also say "EXHIBITS" — fix to match

### Changes to `SubcontractorContractForm.tsx`

**1. Suppress browser headers/footers in print CSS**
- Set `<title>` to empty string (prevents browser from printing title in header)
- Add `@page { margin: 0; }` to eliminate browser-generated headers/footers
- Use `body { margin: 0.5in; }` for content margins instead (same pattern as budget)

**2. Add custom footer on every printed page**
- Use CSS `position: fixed; bottom: 0` footer div with date (left), time (center), page number (right) — matching the budget's `footerContainer` pattern
- Use CSS `counter(page)` for automatic page numbering

**3. Fix exhibit page subtitles in print output**
- Page 3 header subtitle: "EXHIBIT A – SCOPE OF WORK" (not "EXHIBITS")
- Page 4 header subtitle: "EXHIBIT B – PROJECT DRAWINGS" (not "EXHIBITS")

**4. Remove Exhibit C page entirely**
- Delete Page 5 (Exhibit C) from print output
- Remove `generalRequirements` field and on-screen Page 5
- Update `TOTAL_PAGES` from 6 to 5
- Shift Signatures from Page 6 to Page 5
- Update on-screen page numbering accordingly

**5. Fix on-screen exhibit subtitles**
- Page 3: subtitle "EXHIBIT A – SCOPE OF WORK"
- Page 4: subtitle "EXHIBIT B – PROJECT DRAWINGS"
- Page 5: subtitle "SIGNATURES" (was page 6)

### Files Modified
- `SubcontractorContractForm.tsx` only

