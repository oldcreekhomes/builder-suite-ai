

## Plan: Add "Highlighted Scope of Work" Section to Exhibit B

The uploaded PDF contains two highlighted site plan sheets:
- **Sheet 9 of 38**: Final Site Plan (with highlighted areas for Asphalt, Sidewalk, Driveway Apron, CG-6, CG-2, Entrance Gutter, Flush Curb for Driveways)
- **Sheet 12 of 38**: Utility Plan (with highlighted areas for Sanitary, Storm, Waterline, Open Cut, Trench Repair, Bioretention, Break and Replace Sidewalk, Break and Replace Curb, Domestic Services by Virginia American Water)

### Change: `src/hooks/useTemplateContent.ts`

Append to the end of `DEFAULT_EXHIBITS.projectDrawings` (after "Sheet 5.00: Roof Plans"):

```
\n\nHIGHLIGHTED SCOPE OF WORK\nSheet 9: Final Site Plan\nSheet 12: Utility Plan
```

### Change: `src/components/templates/SubcontractorContractForm.tsx`

Update the migration check to also detect records missing the new "HIGHLIGHTED SCOPE OF WORK" section — if the saved `projectDrawings` does not contain "HIGHLIGHTED SCOPE OF WORK", replace it with the updated default.

### Files to Edit
- `src/hooks/useTemplateContent.ts`
- `src/components/templates/SubcontractorContractForm.tsx`

