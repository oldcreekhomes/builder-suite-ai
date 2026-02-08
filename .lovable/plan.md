

## Add New Marketplace Categories & Import Builder Companies

This plan adds 8 new company type categories identified from Old Creek Homes' vendor database and creates an edge function to import their 338 companies into the marketplace.

### New Categories to Add

Based on Old Creek Homes' companies that couldn't be categorized:

| New Category | Parent Category | Examples from Old Creek |
|-------------|-----------------|-------------------------|
| Appliance Supplier | Material Suppliers | ABW Appliances, ADU Appliances |
| Land Surveyor | Engineers | Blue Ridge Surveying, Foster Surveying |
| Abatement Contractor | Specialty Contractors | Capital Abatement, Harbor Environmental |
| Environmental Consultant | Government & Services | CRS Environmental, Capitol Environmental |
| Materials Testing Lab | Engineers | Dulles Geotechnical, Froehling & Robertson |
| Water Treatment Contractor | MEP Contractors | Culligan, Kinetico |
| Print/Reprographics Service | Government & Services | ABC Imaging, Staples Print |
| Home Designer | Designers | Good Life House Plans, DesignBasics |

### Implementation Steps

**Step 1: Update `src/constants/companyTypes.ts`**

Add new types to existing categories (alphabetically sorted):
- **Designers**: Add "Home Designer"
- **Engineers**: Add "Land Surveyor", "Materials Testing Lab"
- **Government & Services**: Add "Environmental Consultant", "Print/Reprographics Service"
- **Material Suppliers**: Add "Appliance Supplier"
- **MEP Contractors**: Add "Water Treatment Contractor"
- **Specialty Contractors**: Add "Abatement Contractor"

**Step 2: Update `src/constants/companyTypeGoogleMapping.ts`**

Add Google Places keyword mappings for each new type:
```text
"Appliance Supplier": { keyword: "appliance store" }
"Land Surveyor": { keyword: "land surveyor" }
"Abatement Contractor": { keyword: "asbestos abatement contractor" }
"Environmental Consultant": { keyword: "environmental consultant" }
"Materials Testing Lab": { keyword: "geotechnical testing laboratory" }
"Water Treatment Contractor": { keyword: "water treatment contractor" }
"Print/Reprographics Service": { keyword: "blueprint printing reprographics" }
"Home Designer": { keyword: "home designer house plans" }
```

**Step 3: Create `supabase/functions/import-builder-companies/index.ts`**

Edge function that:
1. Queries all 338 active companies from Old Creek Homes (`home_builder_id = '2653aba8-d154-4301-99bf-77d559492e19'`)
2. Applies keyword-based categorization using 50+ patterns
3. Filters out generic vendors (Amazon, Aldi, etc.)
4. Checks for duplicates by company name in `marketplace_companies`
5. Inserts matched companies with `source: 'builder_import'`
6. Returns detailed results showing added, skipped, and uncategorizable companies

**Categorization Keywords:**

```text
┌─────────────────────────────┬────────────────────────────────────┐
│ Keyword Pattern             │ Marketplace Type                   │
├─────────────────────────────┼────────────────────────────────────┤
│ plumb                       │ Plumbing Contractor                │
│ electric                    │ Electrical Contractor              │
│ hvac, heating, air cond     │ HVAC Contractor                    │
│ roof                        │ Roofing Contractor                 │
│ frame, framing              │ Framing Contractor                 │
│ paint                       │ Painter                            │
│ floor                       │ Flooring Contractor                │
│ tile                        │ Tile Contractor                    │
│ cabinet                     │ Cabinet Installer                  │
│ mason                       │ Masonry Contractor                 │
│ concrete                    │ Concrete Contractor                │
│ excavat                     │ Excavation Contractor              │
│ landscape                   │ Landscaping Contractor             │
│ architect                   │ Architect                          │
│ insulation                  │ Insulation Contractor              │
│ drywall                     │ Drywall Contractor                 │
│ lumber                      │ Lumber Yard                        │
│ window                      │ Window Installer                   │
│ door                        │ Door Installer                     │
│ fence                       │ Fence Contractor                   │
│ pool, spa                   │ Pool/Spa Contractor                │
│ garage door                 │ Garage Door Installer              │
│ gutter                      │ Gutter Contractor                  │
│ siding                      │ Siding Contractor                  │
│ deck                        │ Deck Contractor                    │
│ paving, asphalt             │ Paving Contractor                  │
│ elevator                    │ Elevator Installer                 │
│ sprinkler                   │ Fire Sprinkler Contractor          │
│ survey                      │ Land Surveyor                      │
│ septic                      │ Septic System Installer            │
│ counter, granite, stone     │ Countertop Installer               │
│ appliance                   │ Appliance Supplier                 │
│ abatement                   │ Abatement Contractor               │
│ environmental               │ Environmental Consultant           │
│ geotechnical, testing       │ Materials Testing Lab              │
│ water treatment, culligan   │ Water Treatment Contractor         │
│ imaging, blueprint, print   │ Print/Reprographics Service        │
│ design, plan                │ Home Designer                      │
│ trim, millwork              │ Interior Trim Contractor           │
│ fireplace                   │ Fireplace Installer                │
│ glass, mirror               │ Glass/Mirror Contractor            │
│ stucco                      │ Stucco Contractor                  │
│ waterproof                  │ Waterproofing Contractor           │
│ iron, railing               │ Metal Railing Contractor           │
│ solar                       │ Solar/Renewable Energy Contractor  │
│ security                    │ Security System Installer          │
│ generator                   │ Generator Installer                │
│ audio, video, theater       │ Audio/Video Installer              │
│ closet                      │ Closet System Installer            │
│ stair                       │ Stair Contractor                   │
│ demolition                  │ Demolition Contractor              │
│ tree                        │ Tree Service                       │
│ hardscape, patio            │ Patio Contractor                   │
└─────────────────────────────┴────────────────────────────────────┘
```

**Excluded Vendors (Non-Construction):**
- Amazon, Aldi, Costco, Home Depot, Lowe's, Walmart
- 1-800-Flowers, Cava, FedEx, UPS
- Any company without phone, website, or address

**Step 4: Update `supabase/config.toml`**

Add the new edge function configuration:
```toml
[functions.import-builder-companies]
verify_jwt = false
```

**Step 5: Update `supabase/functions/populate-marketplace/index.ts`**

Add the 8 new categories to the `GOOGLE_PLACES_MAPPING` constant so they can also be populated via Google Places API.

### Expected Results

- ~150-200 companies will be categorized and added to marketplace
- ~100+ will be skipped (generic vendors, duplicates, uncategorizable)
- All imports will show `source: 'builder_import'` for tracking
- New builders will see familiar local trade names in the marketplace

### Files to Create/Modify

1. **Modify**: `src/constants/companyTypes.ts` - Add 8 new types
2. **Modify**: `src/constants/companyTypeGoogleMapping.ts` - Add 8 new keyword mappings + update categories array
3. **Create**: `supabase/functions/import-builder-companies/index.ts` - Import logic
4. **Modify**: `supabase/config.toml` - Add function entry
5. **Modify**: `supabase/functions/populate-marketplace/index.ts` - Add new types to mapping

