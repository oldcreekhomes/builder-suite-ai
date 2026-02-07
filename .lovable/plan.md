

# UI Standardization Plan: Companies & Representatives Tables

## Current Inconsistencies Identified

After analyzing all four tabs (Companies, Representatives, Marketplace, Marketplace Reps), here are the inconsistencies:

### 1. Name Column Format

| Tab | Current Format |
|-----|----------------|
| Companies | "Company Name" (single column) |
| Representatives | "First Name" + "Last Name" (two columns) |
| Marketplace | "Company Name" (single column) |
| Marketplace Reps | "Name" (single combined column: "John Smith") |

**Issue**: Marketplace Reps combines first/last name into one "Name" column, while Representatives uses separate columns.

### 2. Delete Button Appearance and Location

| Tab | Delete Button | Location |
|-----|---------------|----------|
| Companies | Orange Archive icon (no trash) | In Actions, no header text alignment |
| Representatives | Red Trash icon (DeleteButton component) | In Actions, right-aligned header |
| Marketplace | No delete (View only) | N/A |
| Marketplace Reps | Red Trash icon (DeleteButton component) | In Actions, no text alignment |

### 3. Actions Column Header Alignment

| Tab | "Actions" Header Alignment |
|-----|----------------------------|
| Companies | Left-aligned (default) |
| Representatives | `text-right` |
| Marketplace | `text-right` |
| Marketplace Reps | Left-aligned (default) |

### 4. Action Button Sizes

| Tab | Edit Button | Delete Button |
|-----|-------------|---------------|
| Companies | `h-6 w-6` | `h-6 w-6` (Archive icon) |
| Representatives | `h-8 w-8` | Standard DeleteButton |
| Marketplace | `h-6` text button | N/A |
| Marketplace Reps | `h-6 w-6` | Standard DeleteButton |

### 5. Container Styling

| Tab | Container Style |
|-----|-----------------|
| Companies | `border rounded-lg overflow-hidden` |
| Representatives | `border rounded-lg` |
| Marketplace | `bg-white rounded-lg border shadow-sm` |
| Marketplace Reps | `bg-white rounded-lg border shadow-sm` |

---

## Standardization Plan

### Standard to Apply

Use **Representatives** table as the baseline standard since it's the most complete, with these unified rules:

#### A. Name Columns
- **Representatives**: Keep "First Name" + "Last Name" (two columns)
- **Marketplace Reps**: Change from single "Name" to "First Name" + "Last Name" (two columns)

#### B. Actions Column
- Header: `text-right` alignment for all tables
- Button sizes: `h-6 w-6` for icon buttons (standardize Representatives from h-8 to h-6)
- Delete/Archive: Use consistent `DeleteButton` component with red trash icon for Representatives and Marketplace Reps
- Companies: Keep Archive (orange) icon since archiving is different from deleting

#### C. Container Styling
- Standardize to: `border rounded-lg` (simpler, consistent)

---

## Implementation Details

### File 1: `src/components/representatives/RepresentativesTable.tsx`

**Changes:**
1. Line 292: Actions header already has `text-right` - OK
2. Lines 387-391: Change edit button from `h-8 w-8` to `h-6 w-6`
3. Line 279: Container - already uses `border rounded-lg` - OK

### File 2: `src/components/marketplace/MarketplaceRepresentativesTable.tsx`

**Changes:**
1. Line 122: Change header from "Name" to "First Name"
2. Add new header column after "First Name": "Last Name"
3. Line 127: Change Actions header to include `text-right`
4. Lines 133-136: Split the name display into two separate TableCells
5. Update all `colSpan` values from 6 to 7
6. Line 118: Change container from `bg-white rounded-lg border shadow-sm` to `border rounded-lg`

### File 3: `src/components/marketplace/MarketplaceCompaniesTable.tsx`

**Changes:**
1. Line 74: Change container from `bg-white rounded-lg border shadow-sm` to `border rounded-lg`

### File 4: `src/components/companies/CompaniesTable.tsx`

**Changes:**
1. Line 228: Change Actions header to include `text-right`
2. Line 218: Container already uses `border rounded-lg overflow-hidden` - change to `border rounded-lg` for consistency

---

## Summary of Changes

| Component | Changes |
|-----------|---------|
| RepresentativesTable | Reduce edit button size from h-8 to h-6 |
| MarketplaceRepresentativesTable | Split "Name" into "First Name" + "Last Name", add `text-right` to Actions, update container |
| MarketplaceCompaniesTable | Update container styling |
| CompaniesTable | Add `text-right` to Actions header, update container styling |

## Result

After implementation:
- All tables use the same container styling
- All "Actions" headers are right-aligned
- All representative tables (both your companies and marketplace) display First Name and Last Name as separate columns
- All edit buttons are uniformly sized at `h-6 w-6`
- Delete buttons use the consistent `DeleteButton` component

