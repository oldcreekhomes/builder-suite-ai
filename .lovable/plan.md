

# Marketplace Category Filter Sidebar

## Overview

Replace the current dropdown category filter with a clean sidebar navigation panel (similar to the Settings page) that displays parent categories with expandable/flyout child types. This will give users a much more organized way to browse the 50+ company types.

## Current Problem

- The category dropdown shows all categories in a flat list
- When a parent category is selected, ALL children in that category are displayed at once
- Users cannot quickly isolate a specific company type like "Architect" vs "Interior Designer"
- The UI is cramped and hard to navigate with 9 categories and 50+ child types

## Solution

Create a sidebar-style filter panel on the left side of the Marketplace page:

```text
+-------------------+------------------------------------------+
| Marketplace       |                                          |
| Category Filter   |  Companies Table                         |
|                   |                                          |
| > All Companies   |  [Search bar]                            |
|                   |                                          |
| Financial & Legal |  | Company | Type | Location | etc...   |
|   > Accountant    |  | ABC Co  | ...  | ...      |           |
|   > Appraiser     |  | XYZ Inc | ...  | ...      |           |
|   > Attorney      |                                          |
|   > ...           |                                          |
|                   |                                          |
| Design & Eng      |                                          |
|   > Architect     |                                          |
|   > Civil Eng     |                                          |
|   > ...           |                                          |
|                   |                                          |
| Site Work         |                                          |
| Structural Trades |                                          |
| ...               |                                          |
+-------------------+------------------------------------------+
```

## UI Design

- Left sidebar (approximately 220px wide) with a clean vertical list
- Parent categories shown as collapsible sections (accordion-style)
- Click parent category header to expand/collapse children
- Click a specific child type to filter the table to ONLY that type
- "All Companies" option at the top to clear all filters
- Active selection highlighted with a left border (like Settings page)
- Children indented under their parent category

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/marketplace/MarketplaceCategorySidebar.tsx` | Create | New sidebar component with collapsible categories |
| `src/pages/Marketplace.tsx` | Modify | Replace dropdown with sidebar, adjust layout to side-by-side |

## Technical Implementation

### 1. MarketplaceCategorySidebar Component

- Uses Collapsible component from Radix UI (already installed)
- Props:
  - `selectedCategory: string` - currently selected parent category ("all" or category name)
  - `selectedType: string | null` - currently selected child type (for granular filtering)
  - `onCategoryChange: (category: string) => void`
  - `onTypeChange: (type: string | null) => void`
- Structure:
  - "All Companies" link at top
  - Each category is a collapsible section
  - Children are indented list items under each category
  - Clicking a child sets both category AND type
  - Clicking the parent category header toggles collapse and optionally selects all types

### 2. Marketplace Page Layout Changes

- Change from single-column layout to flex row with sidebar + content
- Remove the Select dropdown for categories
- Keep the search bar in the main content area
- Pass both `selectedCategory` and `selectedType` to the table component

### 3. MarketplaceCompaniesTable Filtering Update

- Add `selectedType` prop to filter by specific company type
- When `selectedType` is set, show only companies with that exact type
- When only `selectedCategory` is set (no type), show all types in that category

## Styling Approach

Match the Settings page sidebar style:
- Fixed-width sidebar with border-right
- Clean white background
- Active items have a left border accent color
- Hover states for items
- Smooth collapse/expand animations
- Typography: 14px font, semibold for categories, regular for types

