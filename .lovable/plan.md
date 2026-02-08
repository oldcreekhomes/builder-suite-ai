

# Auto-Populate Marketplace with Google Places API

## Overview

Yes, I can absolutely do this! You already have a Google Maps API key configured (`GOOGLE_MAPS_DISTANCE_MATRIX_KEY`), and I can use the **Google Places API Nearby Search** to find top-rated businesses within a 50-mile radius (80,467 meters) of Washington D.C. for each of your 50+ company type categories.

## How It Works

```text
+------------------------+     +---------------------------+     +-------------------------+
|  50+ Company Types     | --> | Google Places API         | --> | marketplace_companies   |
|  (from companyTypes.ts)|     | Nearby Search             |     | table in Supabase       |
|                        |     | 50-mile radius of D.C.    |     |                         |
+------------------------+     +---------------------------+     +-------------------------+
         |                              |                                   |
         v                              v                                   v
  "Plumbing Contractor"    Search: "plumber" near             Company Name: "A&A Plumbing"
  "Electrical Contractor"  38.9072, -77.0369 (D.C.)           Address: "123 Main St, Alexandria"
  "Equipment Rental"       radius: 80467 meters               Rating: 4.8, Reviews: 203
  "Attorney/Legal"         max results: 5                     Phone: (555) 123-4567
                           rankBy: PROMINENCE                 Website: www.aaplumbing.com
```

## Implementation Plan

### 1. Create Mapping File: `src/constants/companyTypeGoogleMapping.ts`

Map each of our 50+ company types to the closest Google Places API search terms:

| Our Company Type | Google Search Query |
|-----------------|---------------------|
| Accountant/CPA | `"accounting"` or `"accountant"` |
| Attorney/Legal Services | `"lawyer"` or `"attorney"` |
| Architect | `"architect"` |
| Plumbing Contractor | `"plumber"` |
| Electrical Contractor | `"electrician"` |
| HVAC Contractor | `"hvac contractor"` |
| Roofing Contractor | `"roofing_contractor"` |
| Equipment Rental | `"equipment rental"` |
| Landscaping Contractor | `"landscaper"` |
| Real Estate Agent | `"real_estate_agency"` |
| ... | ... |

Some types use Google's official place types (like `roofing_contractor`, `electrician`, `plumber`), while others use keyword searches for better results.

### 2. Create Edge Function: `supabase/functions/populate-marketplace/index.ts`

A new edge function that:

1. **Accepts parameters**: 
   - `centerLocation`: Lat/Lng (defaults to Washington D.C.: 38.9072, -77.0369)
   - `radiusMeters`: Search radius (max 50,000m per API call, we'll use multiple calls to cover 50 miles)
   - `maxResultsPerCategory`: Number of companies per type (default: 5)
   - `categories`: Which company type categories to populate (or "all")

2. **For each company type**:
   - Calls Google Places Nearby Search API
   - Filters by rating (minimum 4.0 stars)
   - Retrieves: name, address, phone, website, rating, review count
   - Calls Place Details API for additional info if needed

3. **Deduplicates** results (same company may appear in multiple searches)

4. **Inserts into `marketplace_companies`** table with:
   - `company_name`: From Google
   - `company_type`: Our category (e.g., "Plumbing Contractor")
   - `address`: From Google
   - `phone_number`: From Google
   - `website`: From Google
   - `rating`: From Google
   - `review_count`: From Google
   - `source`: "google_places" (new field to track auto-populated entries)

### 3. Update Database Schema

Add a `source` column to track where companies came from:

```sql
ALTER TABLE marketplace_companies 
ADD COLUMN source TEXT DEFAULT 'manual';
-- Values: 'manual' (user signup), 'google_places' (auto-populated)
```

### 4. Create Admin UI: `src/components/admin/MarketplacePopulator.tsx`

A simple admin interface with:
- Button to trigger population
- Category selector (all or specific categories)
- Progress indicator showing which category is being processed
- Results summary (X companies added for Y categories)

### 5. Google Places API Mapping (Complete List)

```typescript
export const GOOGLE_PLACES_MAPPING = {
  // Financial & Legal Services
  "Accountant/CPA": { keyword: "accountant CPA" },
  "Appraiser": { keyword: "real estate appraiser" },
  "Attorney/Legal Services": { type: "lawyer" },
  "Construction Lender": { keyword: "construction loan lender" },
  "Mortgage Lender": { keyword: "mortgage lender" },
  "Insurance Agent": { type: "insurance_agency" },
  "Surety Bond Provider": { keyword: "surety bond" },
  "Title Company": { keyword: "title company" },
  
  // Design & Engineering
  "Architect": { keyword: "architect" },
  "Civil Engineer": { keyword: "civil engineering firm" },
  "Geotechnical Engineer": { keyword: "geotechnical engineering" },
  "Interior Designer": { keyword: "interior designer" },
  "Landscape Architect": { keyword: "landscape architect" },
  "Land Surveyor": { keyword: "land surveyor" },
  "MEP Engineer": { keyword: "mechanical electrical plumbing engineer" },
  "Structural Engineer": { keyword: "structural engineer" },
  
  // Site Work & Foundation
  "Concrete Contractor": { keyword: "concrete contractor" },
  "Demolition Contractor": { keyword: "demolition contractor" },
  "Excavation Contractor": { keyword: "excavation contractor" },
  "Foundation Contractor": { keyword: "foundation contractor" },
  "Grading Contractor": { keyword: "grading contractor" },
  "Paving Contractor": { keyword: "paving contractor" },
  "Septic System Installer": { keyword: "septic system installer" },
  "Utility Contractor": { keyword: "utility contractor" },
  
  // Structural Trades
  "Framing Contractor": { keyword: "framing contractor" },
  "Masonry Contractor": { keyword: "masonry contractor" },
  "Roofing Contractor": { type: "roofing_contractor" },
  "Siding Contractor": { keyword: "siding contractor" },
  "Steel Fabricator": { keyword: "steel fabricator" },
  "Truss Manufacturer": { keyword: "truss manufacturer" },
  
  // Mechanical Systems
  "Electrical Contractor": { type: "electrician" },
  "Fire Protection/Sprinkler": { keyword: "fire sprinkler contractor" },
  "HVAC Contractor": { keyword: "HVAC contractor" },
  "Plumbing Contractor": { type: "plumber" },
  "Solar/Renewable Energy": { keyword: "solar installer" },
  "Low Voltage/Security": { keyword: "security system installer" },
  
  // Interior Trades
  "Cabinet Maker": { keyword: "cabinet maker" },
  "Countertop Fabricator": { keyword: "countertop fabricator" },
  "Drywall Contractor": { keyword: "drywall contractor" },
  "Flooring Contractor": { type: "flooring_contractor" },
  "Insulation Contractor": { keyword: "insulation contractor" },
  "Painter": { type: "painter" },
  "Tile Contractor": { keyword: "tile contractor" },
  "Window/Door Installer": { keyword: "window door installer" },
  
  // Exterior & Landscaping
  "Deck/Fence Contractor": { keyword: "deck fence contractor" },
  "Garage Door Installer": { keyword: "garage door installer" },
  "Gutter Contractor": { keyword: "gutter contractor" },
  "Landscaping Contractor": { keyword: "landscaper" },
  "Pool/Spa Contractor": { keyword: "pool contractor" },
  "Irrigation Contractor": { keyword: "irrigation contractor" },
  
  // Materials & Equipment
  "Building Materials Supplier": { type: "hardware_store" },
  "Equipment Rental": { keyword: "equipment rental" },
  "Fixture Supplier": { keyword: "plumbing fixtures supplier" },
  "Lumber Yard": { keyword: "lumber yard" },
  "Ready-Mix Concrete": { keyword: "ready mix concrete" },
  
  // Government & Other
  "Municipality/Permitting": { type: "local_government_office" },
  "Utility Company": { keyword: "utility company" },
  "Home Warranty Provider": { keyword: "home warranty" },
  "Real Estate Agent": { type: "real_estate_agency" },
};
```

## Technical Considerations

### API Limits
- Google Places API has a 50,000 meter (31 mile) radius limit per search
- To cover 50 miles, we'll make 2 overlapping searches per category
- Rate limiting: Add delays between API calls to avoid hitting quotas

### Deduplication Strategy
- Check for existing companies by matching name + address
- Skip duplicates during insert

### Expected Results
- 50+ categories × 5 companies each = **250+ pre-populated companies**
- All with ratings 4.0+ stars
- All within 50-mile radius of D.C.

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/constants/companyTypeGoogleMapping.ts` | Create | Mapping of our types to Google search terms |
| `supabase/functions/populate-marketplace/index.ts` | Create | Edge function to call Google Places API |
| `src/components/admin/MarketplacePopulator.tsx` | Create | Admin UI to trigger population |
| `src/pages/Admin.tsx` or similar | Modify | Add link to populator tool |
| Database migration | Create | Add `source` column to `marketplace_companies` |

## Estimated Implementation Time
- Edge function + mapping: ~40 minutes
- Admin UI: ~15 minutes  
- Testing and refinement: ~15 minutes

