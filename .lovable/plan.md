

## Plan: Expand Scope of Work textarea to match Articles page size

### Problem
The Scope of Work page (page 4) shows a small textarea (`min-h-[120px]`), while the Articles pages show full, readable content spanning the page. The textarea needs to be much larger to fill the page and be readable.

### Changes — `src/components/templates/SubcontractorContractForm.tsx`

1. **Page 4 (Scope of Work)**: Change `min-h-[120px]` to `min-h-[600px]` on the textarea so it fills the visible page area, matching the content height of the Articles pages.

2. **Page 6 (Exhibit B – Project Drawings)**: Also increase `min-h-[80px]` to `min-h-[400px]` for consistency.

This makes both editable textarea pages use the available page space fully, matching the visual density of the Articles pages.

