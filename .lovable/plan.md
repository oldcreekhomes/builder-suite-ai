

## Plan: Update Signature Page Labels and Print Line Widths

### Changes: `src/components/templates/SubcontractorContractForm.tsx`

**1. On-screen signature section (lines 609, 617)**
Add "Contractor" / "Subcontractor" label above the company name:
```tsx
// Line 609 → replace single line with two lines
<p className="text-xs text-muted-foreground uppercase tracking-wide">Contractor</p>
<p className="font-semibold text-foreground uppercase">{fields.contractorName || "CONTRACTOR"}</p>

// Line 617 → same pattern
<p className="text-xs text-muted-foreground uppercase tracking-wide">Subcontractor</p>
<p className="font-semibold text-foreground uppercase">{fields.subcontractorName || "SUBCONTRACTOR"}</p>
```

**2. Print signature section (lines 403-404)**
- Add "Contractor" / "Subcontractor" label above each company name
- Double the width of the Name and Title underlines (use `_______________` → `______________________________`) — the Date line stays the same

```html
<!-- Each side gets: -->
<p style="font-size: 10px; color: #888; text-transform: uppercase;">Contractor</p>
<p style="font-weight: 600;">OLD CREEK HOMES, LLC</p>
...
<strong>Name:</strong> ______________________________
<strong>Title:</strong> ______________________________
<strong>Date:</strong> _______________   <!-- unchanged -->
```

### Files to Edit
- `src/components/templates/SubcontractorContractForm.tsx`

