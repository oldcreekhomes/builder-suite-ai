

## Phase 1: Tag All Marketplace Companies with Service Areas ✅ DONE

All 2,238 marketplace companies have been tagged:
- **2,208** → "Washington, DC"
- **30** → "Outer Banks, NC"
- Pete's Asphalt address fixed to "Silver Spring, MD"
- Zero NULLs remaining

---

## Phase 2: Replace Distance Filtering with Service Area Filtering ✅ DONE

### Changes Made

**Database migration:**
- Added `allowed_service_areas text[] DEFAULT ARRAY['Washington, DC']` to `marketplace_subscriptions`

**Files modified:**

1. **`src/hooks/useMarketplaceSubscription.ts`** — Removed radius/tier logic, now tracks `allowed_service_areas`
2. **`src/components/marketplace/MarketplaceCompaniesTable.tsx`** — Removed all distance calculation logic, filters by service area match, shows Service Area badge column
3. **`src/pages/Marketplace.tsx`** — Removed radius control, HQ setup modal, replaced with service area selector bar
4. **`src/components/marketplace/UpgradeMarketplaceModal.tsx`** — Changed to per-service-area model
5. **Deleted `src/components/marketplace/MarketplaceRadiusControl.tsx`**

### What Stays
- `marketplace_companies.service_areas` column (now populated)
- `serviceArea.ts` normalization utilities
- Edge functions (`calculate-distances`, `get-google-maps-key`) stay deployed but dormant
- HQ data on users table (used by Settings)
- `marketplace_distance_cache` table (harmless, no longer queried)
- `SetupHQModal.tsx` file (kept but no longer imported — can be cleaned up later)

### Result
- Zero Google API costs from marketplace browsing
- Simpler UX: builder sees suppliers in their region automatically
- Clear future monetization: pay per additional service area
- Consistent with how bidding and projects already work
