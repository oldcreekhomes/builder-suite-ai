
## Plan: Rename Property & Revenue labels + lock Estimated Value in Taxes

### Changes to `src/pages/apartments/ApartmentInputs.tsx`
1. Rename label **"Purchase Price"** → **"Total Costs"** (still bound to `purchase_price` field — no calculation changes).
2. Rename label **"Construction Costs"** → **"Estimated Value"** AND rebind that input to the existing `estimated_value` field (instead of `construction_costs`).
   - This makes the Property & Revenue "Estimated Value" the single source of truth.
   - The Estimated Value shown under Taxes will now mirror this value automatically (both read from `estimated_value`).
3. In the **Taxes** sub-row, render the **Estimated Value** as **read-only** (display only, no input) so users only edit it from Property & Revenue.

### Out of scope
- No DB schema changes (`construction_costs` field remains in the table, just unused by this row).
- No changes to Income Statement, calculations, or other cards.

### Validation
1. Property & Revenue shows "Total Costs" and "Estimated Value" labels.
2. Editing "Estimated Value" in Property & Revenue updates the Taxes → Estimated Value display in real time.
3. Taxes → Estimated Value is not editable (plain text, no input field).
4. Tax calc (`estimated_value × tax_rate`) continues to work using the same field.
