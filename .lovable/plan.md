

## Plan: Pre-populate Exhibit B with Extracted Sheet Index

Update the default `projectDrawings` value in `src/hooks/useTemplateContent.ts` to contain the full 68-entry sheet index extracted from the site plan PDF.

### Change: `src/hooks/useTemplateContent.ts`

Replace the single-line `projectDrawings` default string in `DEFAULT_EXHIBITS` with the complete formatted sheet list:

```
CIVIL / SITE SHEETS
Sheet 1: Cover Sheet
Sheet 2-4A: Conditions
Sheet 5: Overall Site Plan
Sheet 6: Overall Grading Plan
Sheet 7: Detailed Site Plan (1 of 4)
Sheet 8: Detailed Site Plan (2 of 4)
Sheet 9: Detailed Site Plan (3 of 4)
Sheet 10: Detailed Site Plan (4 of 4)
Sheet 11: Detailed Grading Plan (1 of 4)
Sheet 12: Detailed Grading Plan (2 of 4)
Sheet 13: Detailed Grading Plan (3 of 4)
Sheet 14: Detailed Grading Plan (4 of 4)
Sheet 15: Detailed Utility Plan (1 of 4)
Sheet 16: Detailed Utility Plan (2 of 4)
Sheet 17: Detailed Utility Plan (3 of 4)
Sheet 18: Detailed Utility Plan (4 of 4)
Sheet 19: Overall Erosion & Sediment Control Plan
Sheet 20: Detailed E&S Plan (1 of 4)
Sheet 21: Detailed E&S Plan (2 of 4)
Sheet 22: Detailed E&S Plan (3 of 4)
Sheet 23: Detailed E&S Plan (4 of 4)
Sheet 24: E&S Details
Sheet 25: E&S Details
Sheet 26: BMP Details
Sheet 27: Construction Details
Sheet 28: Construction Details
Sheet 29: Stormwater Management Computations
Sheet 30: Outfall Analysis (1 of 2)
Sheet 31: Outfall Analysis (2 of 2)
Sheet 32: Storm Drain Profiles
Sheet 33-34: Site Details
Sheet 35-38: Site Details

TREE PRESERVATION SHEETS
Sheet TP-1: Canopy Credit Calculations
Sheet TP-2: Tree Preservation Plan (1 of 2)
Sheet TP-3: Tree Preservation Plan (2 of 2)
Sheet TP-4: Tree Protection Detail & Key Notes
Sheet TP-5: Tree Preservation Table

LANDSCAPE SHEETS
Sheet L0.01: General Notes
Sheet L1.01: Landscape Plan (1 of 4)
Sheet L1.02: Landscape Plan (2 of 4)
Sheet L1.03: Landscape Plan (3 of 4)
Sheet L1.04: Landscape Plan (4 of 4)
Sheet L2.01: Landscape & Furnishings Schedule
Sheet L3.01: Lighting Plan

ARCHITECTURAL SHEETS
Sheet 2.00: Color Schemes
Sheet 2.01: Strip Elevations – Units #1–#7 (Front)
Sheet 2.02: Strip Elevations – Units #1–#7 (Rear)
Sheet 2.03: Strip Elevations – Units #1–#7 (Side)
Sheet 2.04: Strip Elevations – Units #8–#12 (Front)
Sheet 2.05: Strip Elevations – Units #8–#12 (Rear)
Sheet 2.06: Strip Elevations – Units #8–#12 (Side)
Sheet 2.07: Strip Elevations – Units #13–#19 (Front)
Sheet 2.08: Strip Elevations – Units #13–#19 (Rear)
Sheet 2.09: Strip Elevations – Units #13–#19 (Side)
Sheet 3.00: FAR Plans – Units #1–#7
Sheet 3.01: Floor Plans – Units #1–#7
Sheet 3.02: FAR Plans – Units #8–#12
Sheet 3.03: Floor Plans – Units #8–#12
Sheet 3.04: FAR Plans – Units #13–#19
Sheet 3.05: Floor Plans – Units #13–#19
Sheet 3.06: Floor Plans – Units #1–#7
Sheet 3.07: Floor Plans – Units #8–#12
Sheet 3.08: Floor Plans – Units #13–#19
Sheet 4.00: Building Sections – Units #1–#7
Sheet 4.01: Building Sections – Units #8–#12
Sheet 4.02: Building Sections – Units #13–#19
Sheet 5.00: Roof Plans
```

### Notes
- Only the `DEFAULT_EXHIBITS.projectDrawings` string changes — no other file or logic affected.
- Existing saved data in the database will not be overwritten; this only affects the default for new contracts.
- The data migration layer will update stale records on next load if desired; otherwise users can manually refresh.

