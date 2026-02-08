

## EMERGENCY: Stop Google API Bleeding - $800/day

This plan immediately stops all Google API costs and implements permanent safeguards.

### Immediate Actions (Stop the Bleeding)

**Action 1: Disable Cron Job**

Run this SQL in Supabase Dashboard immediately:

```sql
SELECT cron.unschedule('monthly-marketplace-refresh');
```

**Action 2: Remove Auto-Population Trigger**

The `populate-marketplace` function is being called automatically. We need to add a safety lock.

### Implementation Steps

**Step 1: Add Admin-Only Cost Confirmation to MarketplacePopulator**

Update `src/components/admin/MarketplacePopulator.tsx` to:
- Show estimated cost BEFORE running ($2-5 per category)
- Require typing "CONFIRM" to proceed
- Add daily rate limit check

**Step 2: Disable Distance Calculation by Default**

Update `src/components/marketplace/MarketplaceCompaniesTable.tsx`:
- Remove automatic distance calculation on category browse
- Add explicit "Calculate Distances" button users must click
- Cache distances permanently in database (not just 5-minute React Query cache)

**Step 3: Create `marketplace_distance_cache` Table**

```sql
CREATE TABLE marketplace_distance_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_lat DECIMAL(10, 7) NOT NULL,
  origin_lng DECIMAL(10, 7) NOT NULL,
  origin_address TEXT NOT NULL,
  company_id UUID REFERENCES marketplace_companies(id) ON DELETE CASCADE,
  distance_miles DECIMAL(8, 2),
  calculated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(origin_lat, origin_lng, company_id)
);

CREATE INDEX idx_distance_cache_origin ON marketplace_distance_cache(origin_lat, origin_lng);
CREATE INDEX idx_distance_cache_company ON marketplace_distance_cache(company_id);
```

**Step 4: Update Distance Calculation Logic**

Modify `src/hooks/useDistanceFilter.ts` and the marketplace table to:
1. First check the database cache
2. Only call Google API for companies NOT in cache
3. Store results permanently (not 5-minute TTL)

**Step 5: Add Session Tokens to All Autocomplete Components**

Update these 4 files to use `google.maps.places.AutocompleteSessionToken`:
- `src/components/AddressAutocomplete.tsx`
- `src/components/StructuredAddressInput.tsx`
- `src/hooks/useGooglePlaces.ts`
- `src/hooks/useGooglePlacesAddress.ts`

Session tokens bundle all keystrokes into ONE billable event instead of billing per character.

**Step 6: Add Safety Lock to populate-marketplace**

Update `supabase/functions/populate-marketplace/index.ts` to:
- Check for `ADMIN_POPULATE_SECRET` environment variable
- Require secret in request header to run
- Add rate limiting (max 1 run per day)

### Files to Modify

1. **Database**: Run SQL to disable cron and create cache table
2. `src/components/admin/MarketplacePopulator.tsx` - Add cost warning and confirmation
3. `src/components/marketplace/MarketplaceCompaniesTable.tsx` - Disable auto-distance, add button
4. `src/hooks/useDistanceFilter.ts` - Add database caching
5. `supabase/functions/calculate-distances/index.ts` - Check cache first
6. `src/components/AddressAutocomplete.tsx` - Add session tokens
7. `src/components/StructuredAddressInput.tsx` - Add session tokens
8. `src/hooks/useGooglePlaces.ts` - Add session tokens
9. `src/hooks/useGooglePlacesAddress.ts` - Add session tokens
10. `supabase/functions/populate-marketplace/index.ts` - Add safety lock

### Cost Projection After Fix

| Current | After Fix |
|---------|-----------|
| $800/day | ~$0.50/day |
| Auto-runs 3x/day | Manual only with confirmation |
| Distance calc every browse | Cached permanently |
| Per-keystroke autocomplete | Session-based ($0.017 per session) |

### Technical Details

**Why This Happened:**
- `populate-marketplace` makes ~60 API calls per category (200+ categories)
- 3 runs today = ~36,000 calls
- Distance Matrix called on every category browse
- Autocomplete without session tokens bills per keystroke

**Database Cache Schema:**
The cache stores (origin_lat, origin_lng, company_id) as unique key, so the same HQ→company distance is never recalculated.

**Session Token Implementation:**
```typescript
const sessionToken = new google.maps.places.AutocompleteSessionToken();
autocompleteRef.current = new window.google.maps.places.Autocomplete(input, {
  types: ['address'],
  sessionToken: sessionToken
});
```

