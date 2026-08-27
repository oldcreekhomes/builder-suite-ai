# Reallocate N Potomac invoices to correct lots

## What to change
- **Pinnacle invoice 40247** ($3,600.00) is currently split across 2405 A/B/C only. Expand it to all **6 lots**: 2401 A/B/C + 2405 A/B/C.
- **Four Homestead invoices** (996248-056, 996251-056, 996252-056, 996237-056) are currently split across 2405 A/B/C only. Move them to **2401 A/B/C**.

## Verified current state
- Pinnacle 40247: 3 lines × $1,200.00 on 2405 A/B/C.
- Homestead 996248-056: 3 lines on 2405 A/B/C ($9,496.24 / $9,496.24 / $9,496.23).
- Homestead 996251-056: 3 lines on 2405 A/B/C ($11,065.59 / $11,065.59 / $11,065.58).
- Homestead 996252-056: 3 lines on 2405 A/B/C ($8,143.65 / $8,143.65 / $8,143.65).
- Homestead 996237-056: 3 lines on 2405 A/B/C ($5,921.41 / $5,921.41 / $5,921.41).
- All have matching bill journal entries with the same lot splits.

## How I will do it
1. Update existing `bill_lines` to point at 2401 A/B/C for the Homestead invoices (keeping the same split amounts).
2. Update existing `bill_lines` for Pinnacle 40247 to point at 2401 A/B/C (keeping $1,200.00 each), then insert 3 new 2405 A/B/C lines at $600.00 each so the total stays $3,600.00.
3. Update matching `journal_entry_lines` to mirror the new lot assignments.
4. Verify each bill total is unchanged and journal entries still balance.

## Notes
- The ApartmentIncomeStatement `perUnit` build error was already verified as a stale error; the current file compiles clean. This plan covers only the lot reallocations from the screenshot.
