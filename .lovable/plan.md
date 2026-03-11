

## Plan: Add Page Navigation to Subcontractor Contract

### Concept
Split the contract form into 4 logical pages and add a pagination bar above the document (inside the white card, above "SUBCONTRACT AGREEMENT"). Only the active page's content is shown at a time. Users navigate with Previous/Next buttons and page number indicators.

### Page Breakdown
1. **Page 1**: Header ("SUBCONTRACT AGREEMENT"), Subcontract Summary, Key Contacts, Articles 1–7
2. **Page 2**: Articles 8–14
3. **Page 3**: Signatures
4. **Page 4**: Exhibits A, B, C

### UI
- A pagination bar at the top of the document card: `← Previous | Page 1 of 4 | Next →`
- Page number buttons (1, 2, 3, 4) shown as small clickable indicators, active page highlighted
- Compact, consistent with app styling

### Implementation
**File: `SubcontractorContractForm.tsx`**
- Add `currentPage` state (default 1, range 1–4)
- Render a pagination nav bar above the content sections
- Conditionally render each section based on `currentPage`
- For print: all pages render (pagination bar hidden via `no-print` class)

### Print Behavior
When printing, all 4 pages render together with `print-page-break` classes between them, and the pagination bar is hidden. This preserves the existing print-to-PDF flow.

