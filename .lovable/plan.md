

# Massive Marketplace Category Expansion Plan

## Overview

Transform the marketplace from ~55 company types to 200+ types by:
1. Restructuring parent categories based on your requests
2. Deriving new company types from your 300 cost codes
3. Expanding 10 companies per type → targeting 2,000+ companies per geographic region
4. This supports the $100/month per company revenue model

---

## Part 1: Category Restructuring

### Current → New Structure

| Current Category | New Categories |
|------------------|----------------|
| Design & Engineering | **Designers** + **Engineers** |
| Site Work & Foundation | **Site Work Contractors** |
| Mechanical Systems | **MEP Contractors** |
| Materials & Equipment | **Material Suppliers** + **Equipment Suppliers** |
| Legal Services | **Legal Services** (expanded with specialty attorneys) |
| Interior Trades | Expanded 10x based on cost codes |
| Financial Services | Keep but expand |
| Structural Trades | Keep but expand |
| Exterior & Landscaping | Keep but expand |

---

## Part 2: New Category Breakdown

### 1. DESIGNERS (split from Design & Engineering)
- Architect
- Interior Designer
- Landscape Architect
- Kitchen Designer
- Bath Designer
- Lighting Designer
- Closet Designer
- Home Theater Designer

### 2. ENGINEERS (split from Design & Engineering)
- Civil Engineer
- Structural Engineer
- Geotechnical Engineer
- MEP Engineer (Mechanical/Electrical/Plumbing)
- Mechanical Engineer
- Electrical Engineer
- Plumbing Engineer
- Transportation Engineer
- Environmental Engineer
- Stormwater Engineer
- Fire Protection Engineer

### 3. SITE WORK CONTRACTORS (renamed from Site Work & Foundation)
- Excavation Contractor
- Grading Contractor
- Foundation Contractor
- Concrete Contractor
- Demolition Contractor
- Land Clearing Contractor
- Erosion Control Contractor
- Retaining Wall Contractor
- Septic System Installer
- Utility Contractor
- Storm Water Management Contractor
- Earthwork Contractor

### 4. MEP CONTRACTORS (renamed from Mechanical Systems)
- HVAC Contractor
- Electrical Contractor
- Plumbing Contractor
- Fire Sprinkler Contractor
- Low Voltage Contractor
- Security System Installer
- Solar/Renewable Energy Contractor
- Generator Installer
- Smart Home Installer
- Audio/Video Installer

### 5. MATERIAL SUPPLIERS (split from Materials & Equipment)
- Lumber Yard
- Building Materials Supplier
- Roofing Materials Supplier
- Plumbing Fixtures Supplier
- Electrical Fixtures Supplier
- Door & Window Supplier
- Brick & Stone Supplier
- Concrete Supplier (Ready-Mix)
- Insulation Supplier
- Drywall Supplier
- Paint Supplier
- Flooring Supplier
- Tile Supplier
- Cabinet Supplier
- Countertop Supplier
- Hardware Supplier
- Millwork Supplier
- Steel Supplier

### 6. EQUIPMENT SUPPLIERS (split from Materials & Equipment)
- Equipment Rental
- Tool Rental
- Scaffolding Rental
- Heavy Equipment Rental
- Dumpster Rental
- Portable Toilet Rental
- Crane Rental
- Generator Rental

### 7. LEGAL SERVICES (expanded from single type)
- Title Attorney
- Construction Attorney
- Business Attorney
- Land Use Attorney
- Real Estate Attorney
- Contract Attorney
- Lien Attorney
- Environmental Attorney
- Zoning Attorney
- HOA Attorney

### 8. INTERIOR TRADES (expanded based on cost codes)
**Current: 8 types → New: 25+ types**
- Cabinet Manufacturer (renamed from Cabinet Maker)
- Cabinet Installer
- Countertop Fabricator
- Countertop Installer
- Drywall Contractor
- Flooring Contractor
- Hardwood Flooring Installer
- Carpet Installer
- Vinyl/LVP Installer
- Tile Contractor
- Insulation Contractor
- Spray Foam Contractor
- Painter
- Interior Trim Contractor
- Finish Carpenter
- Built-In Cabinet Installer
- Closet System Installer
- Door Installer
- Window Installer
- Stair Contractor
- Millwork Installer
- Wallpaper Installer
- Decorative Painter/Faux Finisher
- Accent Wall Contractor
- Shiplap Installer

### 9. STRUCTURAL TRADES (expanded)
- Framing Contractor
- Masonry Contractor
- Roofing Contractor
- Siding Contractor
- Steel Fabricator
- Truss Manufacturer
- Lumber Framing Contractor
- Floor Joist Installer
- Deck Framing Contractor
- Post-Frame Builder
- Timber Frame Builder

### 10. EXTERIOR & LANDSCAPING (expanded)
- Deck Contractor
- Fence Contractor
- Garage Door Installer
- Gutter Contractor
- Landscaping Contractor
- Pool/Spa Contractor
- Irrigation Contractor
- Paving Contractor
- Driveway Contractor
- Patio Contractor
- Outdoor Living Contractor
- Exterior Painting Contractor
- Pressure Washing Service
- Window Cleaning Service
- Tree Service
- Lawn Care Service

### 11. FINANCIAL SERVICES (expanded)
- Accountant/CPA
- Appraiser
- Construction Lender
- Mortgage Lender
- Insurance Agent
- Surety Bond Provider
- Title Company
- Commercial Lender
- Private Money Lender
- Tax Consultant
- Financial Advisor

### 12. SPECIALTY CONTRACTORS (new category)
- Waterproofing Contractor
- Fireplace Installer
- Shower Door Installer
- Glass/Mirror Contractor
- Metal Railing Contractor
- Wrought Iron Contractor
- Stone Mason
- Brick Mason
- Stucco Contractor
- EIFS Contractor
- Chimney Contractor
- Elevator Installer
- Home Automation Contractor

### 13. GOVERNMENT & SERVICES (expanded)
- Municipality/Permitting
- Utility Company
- Home Warranty Provider
- Real Estate Agent
- Home Inspector
- Mold Inspector
- Termite Inspector
- Energy Auditor
- Arborist

---

## Part 3: Summary of Expansion

| Metric | Current | New |
|--------|---------|-----|
| **Parent Categories** | 10 | 13 |
| **Company Types** | ~55 | **200+** |
| **Companies per Type** | 5 | **10** |
| **Est. Companies/Region** | 275 | **2,000+** |
| **Revenue Potential** | $27,500/mo | **$200,000+/mo** |

---

## Part 4: Technical Implementation

### Files to Modify

1. **`src/constants/companyTypeGoogleMapping.ts`**
   - Completely restructure `COMPANY_TYPE_CATEGORIES` with new parent groups
   - Add 150+ new type entries to `GOOGLE_PLACES_MAPPING`
   - Research appropriate Google Places keywords for each new type

2. **`supabase/functions/populate-marketplace/index.ts`**
   - Update the duplicated `GOOGLE_PLACES_MAPPING` to match
   - Increase `maxResultsPerCategory` from 5 to 10
   - Keep monthly sync (now ~$8-10/month with more categories)

3. **`src/components/marketplace/MarketplaceCategorySidebar.tsx`**
   - No changes needed - already handles dynamic categories

4. **`src/constants/companyTypes.ts`**
   - Sync with the new category structure

---

## Part 5: Google Places Keyword Strategy

Each new company type needs an optimized search keyword:

| Company Type | Google Keyword |
|--------------|----------------|
| Title Attorney | "title attorney" |
| Construction Attorney | "construction lawyer" |
| Land Use Attorney | "land use lawyer zoning" |
| Hardwood Flooring Installer | "hardwood floor installation" |
| Interior Trim Contractor | "interior trim carpentry" |
| Cabinet Manufacturer | "custom cabinet manufacturer" |
| Spray Foam Contractor | "spray foam insulation contractor" |
| Stormwater Engineer | "stormwater management engineering" |

---

## Part 6: Cost Analysis

| Monthly Sync | Categories | API Calls | Monthly Cost |
|--------------|------------|-----------|--------------|
| Current | 55 × 5 | 275 | ~$4.50 |
| **Expanded** | 200 × 10 | 2,000 | ~$34 |

Still very cost-effective for a $200k+/month revenue opportunity.

---

## Implementation Order

1. Create comprehensive `GOOGLE_PLACES_MAPPING` with 200+ types and optimized keywords
2. Create `COMPANY_TYPE_CATEGORIES` with 13 restructured parent groups
3. Update populate-marketplace edge function with new mapping
4. Sync companyTypes.ts for consistency
5. Run initial population for new categories
6. Monthly cron continues automatically

