

## Plan: Align Signature Lines Vertically

### Problem
The "Name:", "Title:", and "Date:" labels have different character widths, causing the underlines to end at different positions. The lines need to end at the same point.

### Fix: `src/components/templates/SubcontractorContractForm.tsx` (lines 403-404)

Use a fixed-width label approach with inline styles so all three lines align consistently. Each label ("Name:", "Title:", "Date:") gets a fixed `display: inline-block; width: 40px` so the underlines all start at the same position and, combined with `width: 100%` on the container, end at the same place.

Replace the current `<p>` tags for Name/Title/Date with a structure like:

```html
<p style="font-size: 11px; margin-top: 8px; display: flex;">
  <strong style="min-width: 40px;">Name:</strong>
  <span style="flex: 1; border-bottom: 1px solid #000;"> </span>
</p>
```

This ensures all three lines (Name, Title, Date) stretch to the full width of their container and end at the same vertical position. Apply to both Contractor and Subcontractor columns.

### Files to Edit
- `src/components/templates/SubcontractorContractForm.tsx` (lines 403-404)

