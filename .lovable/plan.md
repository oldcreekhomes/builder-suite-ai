

## Replace Distance Filter Toggle with Radius Slider

### What Changes
Replace the current toggle + dropdown ("Filter by Distance: ON | Within [50] miles") with a clean radius slider that defaults to 25 miles. The slider will range from 0 to 50 miles in increments of 5 miles (close enough to 10-mile feel while keeping it smooth). The "Access MarketPlace" box stays as-is.

### How It Works
- Slider defaults to **25 miles** when the modal opens
- Range: **0 to 50 miles** in **5-mile increments**
- Always active (no toggle needed) -- the slider IS the filter
- Shows count: "Showing X of Y suppliers within 25 miles"
- Distance calculation uses the existing `calculate-distances` edge function (already uses Google Maps API -- no new API setup needed)
- Companies without addresses are excluded (existing behavior)

### Google Maps
**No new setup required.** The existing `calculate-distances` edge function already calls Google Distance Matrix API with a configured `GOOGLE_MAPS_API_KEY` secret. This slider just changes the radius value passed to the existing `useDistanceFilter` hook.

### Files Changed

**1. `src/components/bidding/components/DistanceFilterBar.tsx`**
- Remove the toggle switch and dropdown select
- Add a `Slider` component (already installed via shadcn) with range 0-50, step 5, default 25
- Show current radius value and filtered count
- Keep the "Access MarketPlace" box on the right side
- Show "Calculating distances..." indicator when computing

**2. `src/components/bidding/BidPackageDetailsModal.tsx`**
- Change default `distanceRadius` from `50` to `25`
- Remove `distanceFilterEnabled` state (slider is always active)
- Pass `enabled: true` always to `useDistanceFilter`
- Remove the `onEnabledChange` prop from `DistanceFilterBar`

### Technical Details

The `DistanceFilterBar` props simplify:
```text
Before:
  enabled, onEnabledChange, radiusMiles, onRadiusChange, projectAddress, companies, isCalculating

After:
  radiusMiles, onRadiusChange, projectAddress, filteredCount, totalCount, isCalculating
```

The slider UI will look like:
```text
+------------------------------------------+  +---------------------------+
| [pin] Distance: 25 miles                 |  | [store] Access MarketPlace |
| [========|===========] 0 mi ---- 50 mi   |  |  What is MarketPlace? (?) |
| Showing 3 of 8 suppliers within 25 miles |  |                           |
+------------------------------------------+  +---------------------------+
```

No database changes needed. No new edge functions. No new API keys.
