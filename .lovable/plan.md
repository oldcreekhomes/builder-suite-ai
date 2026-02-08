

# Add Marketplace Menu Item to Sidebar + Auto-Populate Data

## Overview

This plan will:
1. **Add a "Marketplace" menu item** to the left sidebar for authenticated home builders like "Old Creek Homes"
2. **Create a new Marketplace page** that displays all companies from the `marketplace_companies` table
3. **Auto-populate the marketplace** by calling the edge function to fetch top-rated contractors from Google Places

## Architecture

```text
+------------------+     +----------------------+     +-------------------------+
|   Left Sidebar   | --> | /marketplace route   | --> | marketplace_companies   |
|   (AppSidebar)   |     | (New Page)           |     | table in Supabase       |
+------------------+     +----------------------+     +-------------------------+
        |                         |                            |
        v                         v                            v
  "Marketplace"            MarketplaceCompaniesTable      Shows 250+ companies
   menu item               (already exists!)              with ratings, contact info
   with Store icon
```

## Implementation Steps

### Step 1: Create Marketplace Page (`src/pages/Marketplace.tsx`)

A new page that:
- Uses the standard app layout with sidebar
- Includes a header with title "Marketplace" and description
- Renders the existing `MarketplaceCompaniesTable` component
- Adds filtering by company type category (using the hierarchical categories)
- Includes a search box for company name/location

### Step 2: Add Route to App.tsx

Add a protected route for the marketplace page:
```typescript
<Route path="/marketplace" element={<ProtectedRoute><Marketplace /></ProtectedRoute>} />
```

### Step 3: Add Marketplace Menu Item to Sidebar

Update `src/components/sidebar/SidebarNavigation.tsx` to include a "Marketplace" menu item:
- Add to the navigation items array
- Use the `Store` icon from Lucide
- Link to `/marketplace`
- Position it appropriately (after Bidding or Purchase Orders)

Also update `src/components/sidebar/CompanyDashboardNav.tsx` to show the Marketplace link on the Company Dashboard.

### Step 4: Deploy Edge Function and Trigger Population

The `populate-marketplace` edge function is already created. I'll:
1. Deploy the edge function
2. Call it with all 50+ categories to auto-populate the marketplace with Washington D.C. area contractors

### Step 5: Enhance MarketplaceCompaniesTable (Optional Improvements)

The existing table already shows:
- Company name
- Type (with color-coded badges)
- Location
- Rating (stars)
- Specialties
- Contact info (phone, website)
- Details button

Enhancements I'll add:
- Category filter dropdown
- Search by company name
- Show total company count
- Indicate Google-sourced companies vs manual signups

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/pages/Marketplace.tsx` | Create | New marketplace page with filters |
| `src/App.tsx` | Modify | Add `/marketplace` route |
| `src/components/sidebar/SidebarNavigation.tsx` | Modify | Add Marketplace menu item |
| `src/components/sidebar/CompanyDashboardNav.tsx` | Modify | Add Marketplace link for dashboard |
| `src/components/marketplace/MarketplaceCompaniesTable.tsx` | Modify | Add filtering and search |

## Expected Result

After implementation:
1. Home builders see "Marketplace" in the left sidebar
2. Clicking it opens a page showing 250+ contractors with ratings
3. Users can filter by category (Plumbing, Electrical, etc.) and search by name
4. The data is pre-populated from Google Places with top-rated D.C. area companies

## Technical Notes

- The Google Maps API key is already configured in Supabase secrets (`GOOGLE_MAPS_DISTANCE_MATRIX_KEY`)
- The `populate-marketplace` edge function will be called to seed the data
- Companies from Google will have `source: 'google_places'` to distinguish from manual signups
- The marketplace is company-agnostic - all home builders see the same directory (this is a value-add service)

