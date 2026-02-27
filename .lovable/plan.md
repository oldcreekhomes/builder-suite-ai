

## Phase 1: Tag All Marketplace Companies with Service Areas

### What and Why
All 2,238 marketplace companies currently have NULL service_areas. Before we can switch to service-area-based filtering, every company needs to be tagged. The addresses already tell us which region each belongs to — 30 are in NC (Outer Banks) and 2,208 are in the DC/MD/VA area.

### Step 1: Bulk-tag companies via SQL
Run two UPDATE statements (using an admin edge function since the insert tool can handle updates):

**Tag NC companies as "Outer Banks, NC":**
```sql
UPDATE marketplace_companies 
SET service_areas = ARRAY['Outer Banks, NC']
WHERE LOWER(address) LIKE '%, nc %' 
   OR LOWER(address) LIKE '%, nc'
   OR LOWER(address) LIKE '%nags head%'
   OR LOWER(address) LIKE '%kitty hawk%'
   OR LOWER(address) LIKE '%kill devil%'
   OR LOWER(address) LIKE '%manteo%'
   OR LOWER(address) LIKE '%hatteras%'
   OR LOWER(address) LIKE '%outer banks%'
   OR LOWER(address) LIKE '%corolla%'
   OR LOWER(address) LIKE '%wanchese%'
   OR LOWER(address) LIKE '%powells point%'
   OR LOWER(address) LIKE '%elizabeth city%'
   OR LOWER(address) LIKE '%edenton%';
```

**Tag everything else as "Washington, DC":**
```sql
UPDATE marketplace_companies 
SET service_areas = ARRAY['Washington, DC']
WHERE service_areas IS NULL OR service_areas = '{}';
```

This uses a temporary edge function (created, deployed, executed, then deleted) since the read-query tool is SELECT-only.

### Step 2: Fix Pete's Asphalt & Concrete
Update the address from the non-geocodable "Maryland / Washington DC / Virginia area" to something reasonable (e.g., "Silver Spring, MD") and ensure service_areas = ["Washington, DC"].

### Step 3: Verify
Query to confirm zero NULLs remain and counts match expectations (~30 OBX, ~2,208 DC).

---

## Phase 2: Replace Distance Filtering with Service Area Filtering

### What Changes

**Database migration:**
- Add `allowed_service_areas text[] DEFAULT ARRAY['Washington, DC']` to `marketplace_subscriptions`

**Files to modify:**

1. **`src/hooks/useMarketplaceSubscription.ts`**
   - Remove radius-based tier limits
   - Replace `max_radius_miles` with `allowed_service_areas` tracking
   - Default free tier gets 1 service area (builder's primary)

2. **`src/components/marketplace/MarketplaceCompaniesTable.tsx`**
   - Remove all distance calculation logic (the `calculateDistances` function, distance state, cache checks, edge function calls)
   - Remove "Calculate Distances" button and distance column
   - Filter companies by matching `service_areas` against the builder's active service areas
   - Show "Service Area" badge instead of distance

3. **`src/pages/Marketplace.tsx`**
   - Remove `MarketplaceRadiusControl` usage and `currentRadius` state
   - Remove `useCompanyHQ` import (no longer needed for marketplace)
   - Remove `SetupHQModal` usage from marketplace (HQ setup stays in Settings)
   - Add a service area display showing which region the builder is browsing

4. **`src/components/marketplace/SetupHQModal.tsx`**
   - Convert from HQ address picker to a service area picker on first visit
   - Builder selects their primary service area (auto-inferred from their company's existing service_areas or address)

5. **`src/components/marketplace/UpgradeMarketplaceModal.tsx`**
   - Change from radius tiers to per-service-area pricing model

6. **Delete `src/components/marketplace/MarketplaceRadiusControl.tsx`** — no longer needed

### What Stays
- The `marketplace_companies.service_areas` column (already exists, will now be populated)
- The `serviceArea.ts` normalization utilities (reused as-is)
- The `ServiceAreaSelector` component pattern (reused)
- Edge functions (`calculate-distances`, `get-google-maps-key`) stay deployed but dormant
- HQ address data on users table stays (useful for Settings/profile)
- The `marketplace_distance_cache` table stays (harmless, no longer queried)

### Result
- Zero Google API costs from marketplace browsing
- Simpler UX: builder sees suppliers in their region automatically
- Clear future monetization: pay per additional service area
- Consistent with how bidding and projects already work
