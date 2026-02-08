

# Fix Company Type Autocomplete: Proper Filtering + Hierarchical Menu

## Issues to Fix

1. **Search showing wrong results**: The `cmdk` library uses fuzzy matching by default, so typing "attor" matches parts of words like "contr**ator**", showing "Excavation Contractor" instead of just "Attorney/Legal Services"

2. **Flat list is hard to browse**: With 50+ options, users want to see organized categories with children appearing to the right when hovering over a parent

## Solution

Replace the current flat autocomplete with a **nested dropdown menu** that:
- Shows parent categories (Financial & Legal, Design & Engineering, etc.)
- When hovering over a category, shows child options to the right
- Uses existing Radix UI `DropdownMenuSub` component for the flyout pattern

## File Changes

### 1. Update `src/constants/companyTypes.ts`
Restructure from a flat array to a categorized object:

```typescript
export const COMPANY_TYPE_CATEGORIES = {
  "Financial & Legal Services": [
    "Accountant/CPA",
    "Appraiser",
    "Attorney/Legal Services",
    "Construction Lender",
    "Mortgage Lender",
    "Insurance Agent",
    "Surety Bond Provider",
    "Title Company",
  ],
  "Design & Engineering": [
    "Architect",
    "Civil Engineer",
    // ... etc
  ],
  // ... all other categories
};

// Keep flat list for validation/database purposes
export const COMPANY_TYPES = Object.values(COMPANY_TYPE_CATEGORIES).flat();
```

### 2. Rewrite `src/components/marketplace/CompanyTypeCombobox.tsx`
Replace the Command-based combobox with a DropdownMenu that has submenus:

```
+---------------------------+
| Select company type     v |
+---------------------------+
         |
         v
+---------------------------+     +----------------------+
| Financial & Legal      > | --> | Accountant/CPA       |
| Design & Engineering   > |     | Appraiser            |
| Site Work & Foundation > |     | Attorney/Legal Svcs  |
| Structural Trades      > |     | Construction Lender  |
| Mechanical Systems     > |     | Mortgage Lender      |
| Interior Trades        > |     | ...                  |
| Exterior & Landscaping > |     +----------------------+
| Materials & Equipment  > |
| Government & Other     > |
+---------------------------+
```

**Key Component Structure:**
- `DropdownMenu` as root
- `DropdownMenuTrigger` - the button showing selected value
- `DropdownMenuContent` - the main panel with categories
- `DropdownMenuSub` + `DropdownMenuSubTrigger` - each category row
- `DropdownMenuSubContent` - the flyout panel with child items
- `DropdownMenuItem` - each selectable company type

### 3. Update `src/pages/MarketplaceSignup.tsx`
No changes needed - the component interface remains the same (`value` and `onSelect` props)

### 4. Update `src/pages/MarketplacePortal.tsx`
No changes needed - same interface maintained

## User Experience

1. User clicks "Select company type" button
2. Menu appears showing 9 category headers with chevrons
3. User hovers/clicks on "Financial & Legal Services"
4. Flyout panel appears to the right with: Accountant/CPA, Appraiser, Attorney/Legal Services, etc.
5. User clicks "Attorney/Legal Services"
6. Menu closes, button now shows "Attorney/Legal Services"

This eliminates the fuzzy search problem entirely and provides a cleaner browsing experience for 50+ options.

