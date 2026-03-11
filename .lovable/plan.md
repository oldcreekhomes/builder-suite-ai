

## Plan: Match Page 1 to Real Contract Format

The screenshots show the actual contract's Page 1 uses a **vertical flowing format** with legal connector text between each party block — not a 3-column grid. The current implementation is missing this narrative structure.

### What Page 1 Should Look Like

Based on the screenshot, Page 1 flows vertically:

1. **"SUBCONTRACT AGREEMENT"** (centered, underlined)
2. `THIS AGREEMENT, made and entered into this` **[Contract Date]** `("Contract Date") by and between`
3. **Contractor block** — bold name, address, phone, PM (stacked vertically)
4. `(hereinafter called the "Contractor") and`
5. **Subcontractor block** — bold name, address, phone, ATTN (stacked vertically)
6. `(hereinafter called "Subcontractor") for work to be performed at`
7. **Project block** — bold name, address, phone, Attn (stacked vertically)
8. `(hereinafter referred to as the "Project").`
9. Then the **contract details** (Contract Amount, Alternate, Start Date) below

### Changes to `SubcontractorContractForm.tsx`

- **Replace** the 3-column `renderContactColumns()` with a new `renderPage1()` that renders the vertical legal format shown in the screenshot
- Each party block shows its fields stacked vertically with bold labels (matching the document style)
- Add the legal connector phrases between blocks as static text
- Keep the contract details section below
- Update print section to match

### Keep Existing

- All fields in `ContractFields` stay the same
- Pages 2-5 unchanged
- Navigation unchanged

