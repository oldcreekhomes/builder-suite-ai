

## Plan: Add "Add Alternate" Section Below Contract Value Breakdown

### What it is
An "Add Alternate" section below the TOTAL row on the summary page (page 1) that lists optional work items the parties may choose to include in the future. Each alternate has a letter, description, and amount — similar to the line items table but separate.

### Data Model Changes

**Add to `ContractFields` interface (or alongside `LineItem`):**
- New `AlternateItem` interface: `{ letter: string; description: string; amount: number }`
- Store alternates in component state alongside `lineItems`
- Include in saved form data via `useContractFormData`

**Default dummy data:**
- Alt 1: "Retaining Walls" — $48,500
- Alt 2: "Additional Clearing — Parcel B" — $12,750
- Alt 3: "Temporary Access Road" — $22,000

### UI Changes (on-screen, page 1, lines ~596-600)

Insert between the contract value table and "Start Date":
- Section header: **"ADD ALTERNATES"**
- Same table structure as Contract Value Breakdown (Item / Description / Amount columns)
- Editable amounts like the main line items
- A total row for alternates
- Button to add/remove alternate rows

### Print Changes (lines ~373-374)

Insert the alternates table in the print HTML between the TOTAL row and Start Date, using matching table styles.

### Files to Edit
- `src/components/templates/SubcontractorContractForm.tsx` — add alternates state, UI table, print HTML
- `src/hooks/useContractFormData.ts` — include `alternates` in `ContractFormData` interface

