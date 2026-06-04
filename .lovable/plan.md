## Combined Cost Report — OCH at Longview + Nob Hill Court

One-off Excel export. No code changes.

### Mapping decisions (from your answers)
- Nob Hill 2150 "Utility Tap Fees" $1,800 → **OCH 4170 Utility Tap Fees** (combined row = $3,600)
- Nob Hill 4015 Office $67.88 → **OCH 4010.3 Office** (combined $134.75)
- Nob Hill 4020 Project Manager $765.00 → **OCH 4010.4 Project Manager** (combined $13,942.48)
- Nob Hill 4040 Office Supplies $1,734.20 → **OCH 4010.2 Office Supplies** (combined $1,744.75)
- Nob Hill 4070 Temporary Toilets $210.52 → **OCH 4040 Temporary Toilets** (combined $210.52)
- Nob Hill "(Uncategorized)" $2,490.00 → separate row at the bottom

### Output (`/mnt/documents/Combined_OCH_NobHill_Costs.xlsx`)

Single sheet "Combined Costs" preserving OCH's grouped structure:

| Code | Description | OCH at Longview | Nob Hill Court | Combined |
|---|---|---|---|---|

- Section headers: 1000 Land / 2000 Soft / 3000 Site / 4000 Homebuilding / Uncategorized
- Subtotal row per section (formulas)
- Grand total at bottom
- **All rows where Combined = $0 are dropped** (per your rule)
- Currency formatted to 2 decimals

### Expected totals (sanity check)
- OCH at Longview (rows retained): ~$1,951,708.79
- Nob Hill Court: $70,439.83
- **Combined grand total: $2,022,148.62**
