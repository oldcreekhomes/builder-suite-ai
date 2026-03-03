

## Import Budget Costs from Pasted Data

### Matching Summary

I matched **~80 line items** from your spreadsheet to existing budget cost codes. Most match perfectly by code number and name. A few match by name only (your numbering differs from the DB in some spots).

### Perfect / Confident Matches (will set quantity=1, unit_price=amount)

All of these will be updated via a single SQL migration:

**1000 - Land Acquisition:** 1010 Lot Costs ($62,500), 1020 Closing Costs ($1,847.83), 1040 Land Taxes ($22.50)

**2000 - Soft Costs:** 2050 Civil Eng ($7,331.24), 2055 Surveying ($158), 2065 Architectural ($1,917.37), 2070 Structural Eng ($591), 2080 Archaeology ($1,474.60), 2100 MEP Eng ($600), 2110 Sprinkler Eng ($0), 2120 Permit Fees ($3,493.75), 2140 Peer Review ($230), 2160 Bond Fees ($466.47), 2180 Drawings ($12.31), 2200 Leed Consultant ($23.75), 2220 Marketing ($12.09), 2240 Legal Land Use ($3,035.59), 2260 Legal HOA ($0), 2280 Geotechnical ($584), 2300 Phase I ($125), 2320 Flow Tests ($84.21), 2380 Landscape Arch ($854.94), 2420 GL Insurance ($121.58), 2460 Start Up ($0), 2480 Misc ($0.57), 2520 Mock Up Panel ($1.28), 2560 Staging ($0), 2580 Sales Commission ($0), 2600 Loan Closing ($0), 2620 Real Estate Taxes ($1,444.14)

**Name-matched soft costs:**
- Your "2125 Transportation Engineering" ($90) → DB code 2130 "Transportation Engineering"
- Your "2150 Utility Impact Fees" ($0) → DB code 2150 "Utility Tap Fees"
- Your "2440 Loan Carrying Costs" ($12,590.24) → DB code 2440 "Land Carrying Costs"
- Your "2450 Home Bld Carry Costs" ($1.62) → DB code 2450 "Home Building Carrying Costs"

**3000 - Site Development:** 3180 Sediment & Erosion ($1,072.74), 3220 Demolition ($2,169.21), 3230 Water & Sewer Shut Off ($257.15), 3260 Site Remediation ($632.76), 3300 Site Clearing ($526.21), 3340 Earthwork ($14,872.53), 3380 Sanitary ($6,818.21), 3420 Water ($4,539.95), 3460 Storm Water ($12,447.53), 3500 Electrical & Telephone ($2,090.79), 3540 Site Lighting & Signs ($1,766.69), 3600 Site Features ($147.98), 3620 Curb & Gutter ($0 — "INC")

**4000 - Homebuilding (your 4010 subcategories → DB separate codes):**
- 4010.1 Parking ($92.43) → DB code 4010
- 4010.2 Office Supplies ($95.36) → DB code 4040
- 4010.3 Office ($4.29) → DB code 4015
- 4010.4 Project Manager ($6,130.73) → DB code 4020
- 4010.5 Accounting ($97.56) → DB code 4025
- 4010.6 Other ($8.34) → DB code 4030

**Your 4020-4050 → DB codes by name:**
- Your 4020 Drawings ($68.19) → DB code 4050
- Your 4030 Signage ($115.99) → DB code 4060
- Your 4040 Temporary Toilets ($319.60) → DB code 4070
- Your 4050 Marketing ($0) → DB code 4080

**Remaining 4000 series (all perfect code+name matches):**
4100 Dumpsters ($1,871.77), 4120 Labor ($3,741.33), 4200 Excavation ($5,924.28), 4210 Utilities ($2,932.79), 4275 Concrete ($10,171.58), 4300 Termite Treatment ($0), 4320 Shaft Wall ($4,093.24), 4330 Lumber ($22,035.15), 4340 Floor Joists ($10,923.45), 4350 Roof Trusses ($858.61), 4360 Interior Stairs ($8,672.16), 4370 Framing Labor ($16,004), 4375 Tyvek ($1,123.20), 4380 Windows ($15,340.51), 4390 Exterior Doors ($4,365.73), 4395 Window & Door Install ($1,900), 4400 Exterior Trim ($9,050), 4430 Roofing ($12,998.09), 4440 Gutters ($897), 4450 Brick Masonry ($4,059.08), 4470 Siding ($4,677), 4490 Garage Door ($1,725), 4500 HVAC ($20,980), 4510 Electrical ($15,130.72), 4515 Electrical Fixtures ($287.99), 4530 Plumbing ($21,967.34), 4550 Sprinkler ($6,599.40), 4560 Insulation ($5,810), 4570 Drywall ($13,765), 4580 Interior Trim ($1,201.62), 4590 Interior Trim Labor ($4,100), 4600 Interior Doors ($3,388.45), 4610 Interior Stair Rails ($3,541.45), 4620 Painting ($9,750), 4630 Cabinets ($7,495.53), 4640 Cabinet Installation ($2,142.86), 4650 Countertops ($3,744.50), 4660 Ceramic Tile ($7,647.59), 4670 Hardwood ($6,446.47), 4690 Bath Accessories ($1,282.78), 4700 Hardware ($1,709.02), 4710 Shower Doors ($1,239.36), 4720 Closet Shelving ($277.31), 4730 Appliances ($6,504), 4740 Cleaning ($2,925), 4750 Powerwashing ($93.43), 4760 Punchout ($4,853.63), 4770 Driveway ($2,398.37), 4790 Leadwalks ($0 — "INC"), 4800 Sidewalk ($3,601.21), 4810 Decks ($8,431.85), 4820 Fencing ($437.15), 4830 Landscaping ($5,164.06), 4840 Sod ($381), 4850 Misc Repairs ($309.16), 4860 Lawn Mowing ($0 — no amount), 4930 Inspection Fees ($413.16), 4980 Service After Settlement ($365.65)

---

### Items That Need Your Guidance (no matching cost code in this project's budget)

| # | Your Code | Your Name | Amount | Notes |
|---|-----------|-----------|--------|-------|
| 1 | 2130 | Affordable Housing Costs | $0.00 | DB code 2130 is "Transportation Engineering" (already used above). No "Affordable Housing" code exists. Amount is $0 so may not matter. |
| 2 | 3060 | Permits & Fees (Site) | $4.00 | No code 3060 in budget. |
| 3 | 4110 | Pest Control | $275.14 | No code 4110 in budget. |
| 4 | 4160 | Permit Fees (Homebuilding) | $0.00 | No code 4160 in budget. Amount is $0. |
| 5 | 4780 | Driveway Apron | INC ($0) | No code 4780 in budget. |
| 6 | 4855 | Warranty Purchase | $882.15 | No code 4855 in budget. There IS code 2540 "Warranty Purchase" in soft costs — should I put it there? |

Please tell me where these 6 items should go (which existing cost code to use, or skip them), and I'll run the full update.

### Implementation

One SQL migration that updates `quantity = 1` and `unit_price = [amount]` for all ~80 matched budget items. All items remain `budget_source = 'manual'`.

