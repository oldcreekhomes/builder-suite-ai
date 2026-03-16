

## Plan: Update Signature Page with Company Names and Date

### What the user wants
On the Signatures page (page 6), replace the generic "CONTRACTOR" / "SUBCONTRACTOR" headings with the actual company names derived from page 1 fields (`contractorName` and `subcontractorName`), and add a "Date:" field below each "Title:" field.

### Changes: `src/components/templates/SubcontractorContractForm.tsx`

**1. On-screen signature section (~line 600-619)**
- Replace hardcoded `"CONTRACTOR"` with `fields.contractorName || "CONTRACTOR"`
- Replace hardcoded `"SUBCONTRACTOR"` with `fields.subcontractorName || "SUBCONTRACTOR"`
- Add a "Date:" line below each "Title:" field using `renderField("Date", "contractorSignerDate")` and `renderField("Date", "subcontractorSignerDate")`

**2. Print signature section (~line 397-401)**
- Same updates: use `fields.contractorName` / `fields.subcontractorName` for headings
- Add `Date: _______________` line below each Title line

**3. Add new fields to `ContractFields` interface (~line 16)**
- Add `contractorSignerDate: string` and `subcontractorSignerDate: string`

**4. Update default fields initialization** to include the two new date fields with empty defaults.

### Files to Edit
- `src/components/templates/SubcontractorContractForm.tsx`

