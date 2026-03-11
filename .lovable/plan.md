

## Plan: Build Templates Page with Subcontractor Contract Template

### Overview
Transform the placeholder Templates page into a card-based gallery (consistent with the app's dashboard card patterns) showing available templates. The first template will be "Subcontractor Contract" — a print-ready 8.5x11 document built from the uploaded DOCX content, with fillable fields that can be customized per use.

### 1. Templates Page — Card Grid Layout

Redesign `src/pages/Templates.tsx` to follow the same layout as Marketplace (AppSidebar + SidebarInset + CompanyDashboardHeader). Display templates as cards in a responsive grid, each showing:
- Template name ("Subcontractor Contract")
- Brief description
- Icon (FileText)
- "Use Template" button

Clicking a card navigates to `/templates/subcontractor-contract`.

### 2. Subcontractor Contract Template Page

**New file: `src/pages/templates/SubcontractorContract.tsx`**

A print-ready 8.5x11 layout containing the full agreement from the uploaded document, with fillable fields for:
- Contractor name, Subcontractor name, Project name
- Contract Amount, Alternate amounts
- Start Date
- Key Contacts (PM, Subcontractor Contact)
- Scope of Work (Exhibit A — editable text area)
- Signature lines with Name/Title fields

**Structure** (from the uploaded DOCX):
- Subcontract Summary (header with key fields)
- Articles 1–14 (standard legal text, not editable — these are the template boilerplate)
- Signatures section
- Exhibits A, B, C

**Print styling**: Use `@media print` CSS and a wrapper sized to 8.5x11 (width: 8.5in, min-height: 11in) with proper margins. Include a "Print" button in the header.

### 3. New Files

| File | Purpose |
|------|---------|
| `src/pages/templates/SubcontractorContract.tsx` | Full template page with fillable fields and print layout |
| `src/components/templates/TemplateCard.tsx` | Reusable card component for the grid |
| `src/components/templates/SubcontractorContractForm.tsx` | The fillable form/print document |
| `src/styles/print.css` | Print-specific styles for 8.5x11 output |

### 4. Modified Files

| File | Change |
|------|--------|
| `src/pages/Templates.tsx` | Replace placeholder with card grid, AppSidebar layout |
| `src/App.tsx` | Add route `/templates/subcontractor-contract` |

### 5. Template Content

All 14 articles from the uploaded document will be hardcoded as the template boilerplate. Fillable fields (inputs) will replace the specific values (company names, amounts, contacts, dates, scope of work). The document header will show the user's company name instead of "Old Creek Homes."

### 6. Print Layout

- Container: `width: 8.5in`, `padding: 1in` (standard letter margins)
- `@media print` hides navigation, buttons, sidebar
- Page breaks between major sections
- Professional typography matching a legal document

No database changes needed — templates are hardcoded for now. Database storage for saved/filled templates can be added later.

