

## Plan: Fix Print Layout and Add Light Gray Border to On-Screen View

### Issues from the PDF printout
1. Page 2 (Articles) has no header — just jumps into "ARTICLE 1" with no context
2. Page 3 (Articles 8+) starts on a new page but there's huge whitespace after Article 7 — all 14 articles should fit on one page
3. Exhibits are all crammed on one page — each exhibit should get its own page with proper header
4. Signatures page has no consistent header
5. No consistent header structure across pages (should be: "SUBCONTRACT AGREEMENT" bold + subtitle + black line)
6. On-screen container has no border (user wants light gray border back for the app view only)

### Changes to `SubcontractorContractForm.tsx`

**1. Add light gray border back to the on-screen container** (line 468)
- Add `border border-border rounded-lg shadow-sm` to the outer container div

**2. Create a reusable print page header function**
- Every printed page gets: "SUBCONTRACT AGREEMENT" (bold, underlined, centered) + subtitle (light gray) + black horizontal line
- Page 1 subtitle: "CONTRACT SUMMARY"
- Page 2 subtitle: "ARTICLES"  
- Page 3 subtitle: "EXHIBITS" (for Exhibit A — Scope of Work)
- Page 4 subtitle: "EXHIBITS" (for Exhibit B — Project Drawings)
- Page 5 subtitle: "EXHIBITS" (for Exhibit C — General Requirements)
- Page 6 subtitle: "SIGNATURES"

**3. Restructure print layout pages**
- **Page 1**: CONTRACT SUMMARY (unchanged — looks good per user)
- **Page 2**: All 14 articles on ONE page (combine `page2Articles` and `page3Articles`). Remove the page break between articles 7 and 8 — they fit on one page with compact spacing
- **Page 3**: EXHIBIT A – SCOPE OF WORK (own page)
- **Page 4**: EXHIBIT B – PROJECT DRAWINGS (own page)
- **Page 5**: EXHIBIT C – GENERAL REQUIREMENTS (own page)
- **Page 6**: SIGNATURES (last page)

**4. Update on-screen pagination to match**
- Change `TOTAL_PAGES` from 5 to 6
- Page 1: Contract Summary
- Page 2: All Articles (1–14)
- Page 3: Exhibit A
- Page 4: Exhibit B
- Page 5: Exhibit C
- Page 6: Signatures

**5. Add consistent header to on-screen pages too**
- Each page (2–6) gets the "SUBCONTRACT AGREEMENT" + subtitle header matching print

### Files Modified
- `SubcontractorContractForm.tsx` only

