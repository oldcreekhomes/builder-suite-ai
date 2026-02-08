

# Alphabetize Categories and Split Financial & Legal

## Overview

This plan addresses three issues:
1. **Parent categories are not in alphabetical order** - currently showing in a random order
2. **Child types within categories are not alphabetized** - making it hard to find specific types
3. **"Financial & Legal Services" is too long** - causing the chevron arrow to be cut off; split into two separate categories

## New Category Structure (Alphabetized)

After splitting and alphabetizing, here are the 10 categories in order:

| # | Category Name | Child Types (Alphabetized) |
|---|---------------|---------------------------|
| 1 | Design & Engineering | Architect, Civil Engineer, Geotechnical Engineer, Interior Designer, Land Surveyor, Landscape Architect, MEP Engineer, Structural Engineer |
| 2 | Exterior & Landscaping | Deck/Fence Contractor, Garage Door Installer, Gutter Contractor, Irrigation Contractor, Landscaping Contractor, Pool/Spa Contractor |
| 3 | Financial Services | Accountant/CPA, Appraiser, Construction Lender, Insurance Agent, Mortgage Lender, Surety Bond Provider, Title Company |
| 4 | Government & Other | Home Warranty Provider, Municipality/Permitting, Other, Real Estate Agent, Utility Company |
| 5 | Interior Trades | Cabinet Maker, Countertop Fabricator, Drywall Contractor, Flooring Contractor, Insulation Contractor, Painter, Tile Contractor, Window/Door Installer |
| 6 | Legal Services | Attorney/Legal Services |
| 7 | Materials & Equipment | Building Materials Supplier, Equipment Rental, Fixture Supplier, Lumber Yard, Ready-Mix Concrete |
| 8 | Mechanical Systems | Electrical Contractor, Fire Protection/Sprinkler, HVAC Contractor, Low Voltage/Security, Plumbing Contractor, Solar/Renewable Energy |
| 9 | Site Work & Foundation | Concrete Contractor, Demolition Contractor, Excavation Contractor, Foundation Contractor, Grading Contractor, Paving Contractor, Septic System Installer, Utility Contractor |
| 10 | Structural Trades | Framing Contractor, Masonry Contractor, Roofing Contractor, Siding Contractor, Steel Fabricator, Truss Manufacturer |

## Files to Modify

| File | Changes |
|------|---------|
| `src/constants/companyTypeGoogleMapping.ts` | Update `COMPANY_TYPE_CATEGORIES` array - split Financial & Legal, alphabetize all |
| `src/constants/companyTypes.ts` | Update `COMPANY_TYPE_CATEGORIES` object - split and alphabetize |
| `supabase/functions/populate-marketplace/index.ts` | Update the comment groupings for consistency (mappings themselves don't need category changes since they're keyed by type name) |

## Technical Implementation

### 1. companyTypeGoogleMapping.ts - COMPANY_TYPE_CATEGORIES array

Replace the current array with alphabetically sorted categories. Each category's `types` array will also be sorted alphabetically.

**Before:**
```typescript
export const COMPANY_TYPE_CATEGORIES = [
  { name: "Financial & Legal Services", types: [...] },
  { name: "Design & Engineering", types: [...] },
  // ... unsorted
];
```

**After:**
```typescript
export const COMPANY_TYPE_CATEGORIES = [
  { name: "Design & Engineering", types: ["Architect", "Civil Engineer", ...] },
  { name: "Exterior & Landscaping", types: ["Deck/Fence Contractor", ...] },
  { name: "Financial Services", types: ["Accountant/CPA", "Appraiser", ...] },
  { name: "Government & Other", types: ["Home Warranty Provider", ...] },
  { name: "Interior Trades", types: ["Cabinet Maker", ...] },
  { name: "Legal Services", types: ["Attorney/Legal Services"] },
  // ... all alphabetized
];
```

### 2. companyTypes.ts - COMPANY_TYPE_CATEGORIES object

Update the Record object to match the new structure with split and alphabetized categories.

### 3. Edge Function Comments

Update the comment groupings in the GOOGLE_PLACES_MAPPING to reflect "Financial Services" and "Legal Services" as separate sections.

## Benefits

- Shorter category names prevent text truncation and arrow clipping
- Alphabetical ordering makes it intuitive to find categories quickly
- Both parent categories and child types are consistently sorted
- 10 categories instead of 9, but each is more focused

