
# Expand Company Types with Searchable Autocomplete

## Overview
Replace the current dropdown with a searchable autocomplete (combobox) and expand the company types from 7 to 50+ options covering a comprehensive range of construction industry partners.

## Changes

### 1. Create Constants File: `src/constants/companyTypes.ts`
A centralized list of 50+ company types organized by category:

**Financial & Legal Services**
- Accountant/CPA
- Appraiser
- Attorney/Legal Services
- Construction Lender
- Mortgage Lender
- Insurance Agent
- Surety Bond Provider
- Title Company

**Design & Engineering**
- Architect
- Civil Engineer
- Geotechnical Engineer
- Interior Designer
- Landscape Architect
- Land Surveyor
- MEP Engineer
- Structural Engineer

**Site Work & Foundation**
- Concrete Contractor
- Demolition Contractor
- Excavation Contractor
- Foundation Contractor
- Grading Contractor
- Paving Contractor
- Septic System Installer
- Utility Contractor

**Structural Trades**
- Framing Contractor
- Masonry Contractor
- Roofing Contractor
- Siding Contractor
- Steel Fabricator
- Truss Manufacturer

**Mechanical Systems**
- Electrical Contractor
- Fire Protection/Sprinkler
- HVAC Contractor
- Plumbing Contractor
- Solar/Renewable Energy
- Low Voltage/Security

**Interior Trades**
- Cabinet Maker
- Countertop Fabricator
- Drywall Contractor
- Flooring Contractor
- Insulation Contractor
- Painter
- Tile Contractor
- Window/Door Installer

**Exterior & Landscaping**
- Deck/Fence Contractor
- Garage Door Installer
- Gutter Contractor
- Landscaping Contractor
- Pool/Spa Contractor
- Irrigation Contractor

**Materials & Equipment**
- Building Materials Supplier
- Equipment Rental
- Fixture Supplier
- Lumber Yard
- Ready-Mix Concrete

**Government & Other**
- Municipality/Permitting
- Utility Company
- Home Warranty Provider
- Real Estate Agent
- Other

### 2. Create Component: `src/components/marketplace/CompanyTypeCombobox.tsx`
A reusable autocomplete component using the existing Command/Popover pattern from the project:

```tsx
// Uses existing Command, CommandInput, CommandList, CommandItem, Popover components
// Features:
// - Type to filter company types
// - Shows matching results as user types
// - Allows selection with click or keyboard
// - Displays "No results" when no matches
// - Matches the visual style of other form inputs
```

### 3. Update: `src/pages/MarketplaceSignup.tsx`
- Remove the local `COMPANY_TYPES` constant
- Import `CompanyTypeCombobox` component
- Replace the `<Select>` with `<CompanyTypeCombobox>`
- Keep the same state management (`companyType`, `setCompanyType`)

### 4. Update: `src/pages/MarketplacePortal.tsx`
- Remove the local `COMPANY_TYPES` constant  
- Import `CompanyTypeCombobox` component
- Replace the `<Select>` with `<CompanyTypeCombobox>`
- Ensure it works in the profile editing context

## User Experience
- User clicks on the Company Type field
- A dropdown appears with a search input at the top
- As the user types (e.g., "plumb"), matching options appear (e.g., "Plumbing Contractor")
- User can select from filtered results or continue typing
- Selected value displays in the input field

## Technical Details
- Uses existing `cmdk` library already installed in the project
- Follows the same pattern used in `StructuredAddressInput.tsx` and `ProjectSelector.tsx`
- Categories are stored in the constants file but displayed in a flat, searchable list
- Component is reusable across Marketplace Signup and Portal pages
