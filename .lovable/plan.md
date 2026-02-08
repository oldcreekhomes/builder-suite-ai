

# Remove "All Companies" and Start with Empty State

## Overview

Change the Marketplace to require users to select a category before seeing any companies. This creates a more intentional browsing experience and reduces the overwhelming feeling of 800+ companies on initial load.

---

## Changes Required

### 1. Marketplace.tsx - Change Default State

Update the initial state from `"all"` to `null` so no category is selected on page load:

```tsx
// Before
const [selectedCategory, setSelectedCategory] = useState<string>("all");

// After  
const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
```

---

### 2. MarketplaceCategorySidebar.tsx - Remove "All Companies" Button

Remove the "All Companies" button entirely from the sidebar (lines 58-70), and update the type definitions to allow `null` for selectedCategory:

- Remove the `handleAllCompaniesClick` function
- Remove the `isAllSelected` check
- Remove the "All Companies" button JSX
- Update the interface to accept `string | null` for selectedCategory

---

### 3. MarketplaceCompaniesTable.tsx - Add Empty State

Update the table to show a helpful empty state when no category is selected:

- Change `selectedCategory` default from `"all"` to `null`
- When `selectedCategory` is `null`, show an empty state message prompting users to select a category
- Hide the "Showing X of Y companies" text when nothing is selected

**Empty state design:**
```
┌────────────────────────────────────────────┐
│                                            │
│         📂 Select a Category               │
│                                            │
│   Choose a company type from the sidebar   │
│   to browse top-rated contractors and      │
│   service providers in your area.          │
│                                            │
└────────────────────────────────────────────┘
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Marketplace.tsx` | Change default selectedCategory to `null` |
| `src/components/marketplace/MarketplaceCategorySidebar.tsx` | Remove "All Companies" button, update types |
| `src/components/marketplace/MarketplaceCompaniesTable.tsx` | Add empty state when no selection, update default |

---

## Result

- Page loads with an empty state and helpful instructions
- Users must actively choose what type of company they want to find
- Cleaner, more intentional UX for discovering specific contractors

