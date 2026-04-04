

## Fix Apartment Income Statement to Match Inputs

### Problems Found

**1. Taxes showing wrong value**
Line 62 uses `inputs.taxes` (the raw database field, still at its default $500,000) instead of `computed.taxes` (which correctly calculates `estimated_value × tax_rate = $3,000,000 × 0.01135 = $34,050`). The `computeFinancials` function already calculates taxes correctly -- the income statement just references the wrong variable.

**2. Missing 7 new operating expense line items**
The income statement only shows: Taxes, Insurance, Utilities, Repairs, Management, Payroll, G&A, Marketing, Reserves. The 7 recently added fields are missing: Landscaping, Trash Removal, Pest Control, Security, Professional Fees, CapEx Reserve, Other/Misc.

### Solution

Update `src/pages/apartments/ApartmentIncomeStatement.tsx`:

1. Change `inputs.taxes` to `computed.taxes` on the Real Estate Taxes row
2. Add 7 new `StatementRow` entries for the missing operating expenses, placed after Marketing and before Reserves

### File Changed
- `src/pages/apartments/ApartmentIncomeStatement.tsx`

