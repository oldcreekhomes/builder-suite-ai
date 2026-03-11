

## Plan: Restructure Page 1 Layout & Add Missing Fields

### What Changes

**Page 1** becomes a summary/contacts-only page with a 3-column vertical layout. Articles move to start on Page 2.

### New Page 1 Layout

Based on the uploaded contract, Page 1 should display:

1. **Header**: "SUBCONTRACT AGREEMENT" + contract date
2. **Three-column contact section**:

```text
┌─────────────────┬─────────────────┬─────────────────┐
│   CONTRACTOR    │  SUBCONTRACTOR  │     PROJECT     │
├─────────────────┼─────────────────┼─────────────────┤
│ Company Name    │ Company Name    │ Project Name    │
│ Address         │ Address         │ Address         │
│ Phone           │ Phone           │ Phone           │
│ PM: Name        │ ATTN: Name      │ ATTN: Name      │
└─────────────────┴─────────────────┴─────────────────┘
```

3. **Contract details row** below: Contract Amount, Alternate, Alternate Amount, Start Date

### Updated Page Breakdown

- **Page 1**: Header, 3-column contacts, contract details (amount, alternate, start date)
- **Page 2**: Articles 1–7
- **Page 3**: Articles 8–14
- **Page 4**: Signatures
- **Page 5**: Exhibits A, B, C

Total pages increases from 4 to 5.

### New Fields to Add

To match the real contract, new fields are needed in the `ContractFields` interface:

- `contractorAddress`, `contractorPhone`
- `subcontractorAddress`, `subcontractorPhone`
- `projectAddress`, `projectPhone`, `projectContact`
- `contractDate`

### Files Modified

- **`SubcontractorContractForm.tsx`**: Add new fields to interface/state, restructure Page 1 into 3-column vertical layout, shift articles to Page 2-3, signatures to Page 4, exhibits to Page 5. Update `TOTAL_PAGES` to 5. Update print section similarly.

