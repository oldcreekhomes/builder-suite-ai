
Goal
- Make Marketplace radius filtering work relative to the builder/GC HQ (e.g., “228 S Washington St, Alexandria, VA”) and ensure the results change correctly when the user changes the radius (15mi should not include Ashburn/Chantilly).
- Keep the slider UX as “30 miles is Free; above 30 requires upgrade” while still showing the full 100-mile scale for context.

What’s actually broken right now (root cause)
- The DB has 809 marketplace companies and 0 of them have lat/lng populated (confirmed via query).
- The table’s distance filtering currently depends on lat/lng. After the recent change to “exclude companies without coordinates”, the result becomes “0 companies” because every company’s coordinates are missing.
- This is why nothing is showing even though you know there are suppliers nearby.

Correct approach for this app (matches “Add Companies” style of using Google)
- Do not rely on lat/lng existing in marketplace_companies.
- Instead, compute distances on-demand from the HQ address to each supplier’s address using the existing Supabase Edge Function `calculate-distances` (it calls Google Distance Matrix API).
- This gives us real “distance from HQ” behavior even when suppliers have no stored coordinates, and it will correctly filter out Ashburn/Chantilly when radius is small.

Implementation design
1) MarketplaceCompaniesTable: compute distance via edge function and filter by currentRadius
- Keep current category/type filtering and search filtering as the first steps (to reduce how many suppliers we compute distances for).
- Build HQ “origin” string from the stored HQ fields:
  - origin = [hq_address, hq_city, hq_state, hq_zip].filter(Boolean).join(', ')
- Build destinations list from supplier addresses:
  - companiesPayload = filteredByCategoryAndSearch.map(c => ({ id: c.id, address: c.address ?? '' }))
- Call:
  - supabase.functions.invoke('calculate-distances', { body: { projectAddress: origin, companies: companiesPayload }})
- Store results as a map: distancesByCompanyId[id] = { distance, error }
- Filtering:
  - Exclude suppliers with distance === null (no address / no route / API failure)
  - Include suppliers where distance <= currentRadius
- Sorting:
  - Sort by distance ascending so closer suppliers appear first.
- Display:
  - Distance column shows the computed distance.
  - If distances are currently being computed, show a lightweight “Calculating distances…” state (keep the table visible but show a subtle loading indicator so it doesn’t feel broken).

2) Make the radius control “Showing X suppliers…” accurate
- Marketplace.tsx currently passes filteredCount={0} totalCount={0} to MarketplaceRadiusControl, so the UI can never be correct.
- Add a callback prop to MarketplaceCompaniesTable, e.g.:
  - onCountsChange({ filteredCount, totalCount, excludedUnknownDistanceCount })
- Marketplace.tsx stores these counts in state and passes them to MarketplaceRadiusControl.
- MarketplaceRadiusControl will then show the real number of suppliers within the selected radius.

3) Handle “unknown distance” suppliers transparently (so users don’t think data vanished)
- Some suppliers may have missing/invalid addresses, causing distance=null.
- We will:
  - Exclude them from “within radius” filtering (because we cannot confirm they are within range).
  - Show a small note above the table such as:
    - “Some suppliers were excluded because their address couldn’t be mapped.”
  - (Optional follow-up) Add a toggle “Include suppliers with unknown distance” to show them at the bottom (clearly labeled “Distance unavailable”).

4) Keep the tier behavior consistent (Free vs Pro vs Enterprise)
- Slider UX stays:
  - Visual scale: 5–100 (Free/Pro), 5–500 (Enterprise)
  - Free users can drag above 30 but it triggers upgrade modal; currentRadius remains capped via maxRadius.
- Table behavior stays:
  - It filters by currentRadius (user-chosen).
  - If you want “locked beyond tier” rows in the future, we can show them when the selected radius is larger than the tier allows, but right now currentRadius is already constrained, so locking is not necessary for correctness.

Files to change
- src/components/marketplace/MarketplaceCompaniesTable.tsx
  - Add a React Query call to `calculate-distances` using HQ address + the currently relevant supplier subset.
  - Replace the current lat/lng Haversine logic with the returned driving distances.
  - Add onCountsChange prop to report filteredCount/totalCount and unknown-distance count.
- src/pages/Marketplace.tsx
  - Track counts state and pass real values into MarketplaceRadiusControl.
- src/components/marketplace/MarketplaceRadiusControl.tsx
  - No major logic change required; just consume the real filteredCount/totalCount values already supported by props.
  - (Optional) Adjust copy to clarify “30 miles free” vs “Pro up to 100”.

Edge cases and safeguards
- Performance:
  - We only compute distances for the currently relevant list (after category/type and search), not all 809 at once.
  - `calculate-distances` already batches 25 destinations/request server-side.
- Caching:
  - Use a stable query key such as:
    - ['marketplace-distances', origin, filteredCompanyIdsHash]
  - That way the app won’t re-call Google unnecessarily unless the HQ or the supplier set changes.
- Rate limits / failures:
  - If the edge function errors, show a clear message:
    - “Could not calculate distances right now. Please try again.”
  - Keep the table list visible (but without distance filtering) only if you explicitly want fallback behavior; otherwise keep a clear error state to avoid misleading results.

Testing checklist (what you should see after the fix)
1) Go to /marketplace with HQ set to “228 S Washington St, Alexandria, VA”.
2) Pick a type (e.g., Driveway Contractor).
3) At 30 miles: you should see suppliers sorted by distance, and the count should be non-zero.
4) Move radius to 15 miles:
   - Suppliers beyond 15 miles (Ashburn/Chantilly) should disappear.
   - The “Showing X suppliers within Y miles” line should update immediately and match the table.
5) Search box still filters the already-in-range results correctly.

Follow-up (optional, but recommended)
- Backfill lat/lng in marketplace_companies via a one-time geocoding job for faster UI sorting and the ability to do server-side geo queries later. This is not required once we use Distance Matrix, but it can improve performance and enable map views.

