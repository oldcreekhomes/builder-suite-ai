
# Fix Marketplace Radius Filtering and Slider Display

## Issues Identified

### Issue 1: Slider Display Confusion
The slider shows "10 miles" on the right side with markers showing "30 mi FREE" and "100 mi PRO", but the slider's max value is set to `maxRadius` (30 for free tier). This creates a confusing visual where the slider can't go past 30, but the "100 mi PRO" marker makes it look like a 100-mile scale.

**Fix**: Redesign the slider to show the full 100-mile (or 500-mile) scale visually, with the 30-mile FREE tier marker positioned at the correct point (30% of the way for a 0-100 scale). Free users can drag up to 30 miles; attempting to go further triggers the upgrade modal.

### Issue 2: Distance Filtering Not Working
All marketplace companies have `lat` and `lng` values as `null` in the database. The current filtering logic includes all companies without coordinates:

```typescript
if (company.distance === null) return true; // Include companies without coordinates
```

This means companies from Ashburn, Chantilly, etc. (which are outside the selected radius) are still shown because they have no coordinates to calculate distance from.

**Fix**: 
1. **Immediate UI fix**: Don't show the Distance column or filter by radius if companies lack coordinates. Instead, show a message explaining the data limitation.
2. **Data fix**: Geocode the marketplace company addresses to populate lat/lng values.

---

## Technical Implementation

### File 1: `src/components/marketplace/MarketplaceRadiusControl.tsx`
Redesign the slider to use a fixed 100-mile scale (or 500 for enterprise), with visual markers at:
- 5 mi (minimum)
- 30 mi (FREE tier limit) - positioned at 30% mark
- 100 mi (PRO tier limit) - positioned at 100% mark

For free users:
- Slider visually extends to 100 miles
- Dragging past 30 miles triggers upgrade modal
- Current value shown clearly

### File 2: `src/components/marketplace/MarketplaceCompaniesTable.tsx`
Update the distance filtering logic:
- If companies lack lat/lng, do NOT default to including them
- Either filter them out OR show them without distance data but clearly indicate "Distance unavailable"
- For companies with lat/lng, properly filter by currentRadius

### File 3: Database geocoding (future enhancement)
Create an edge function or background job to geocode marketplace company addresses and populate lat/lng fields. This is the root fix that makes radius filtering actually work.

---

## Detailed Changes

### MarketplaceRadiusControl.tsx Changes

| Current Behavior | New Behavior |
|-----------------|--------------|
| `sliderMax = tier === 'enterprise' ? 500 : maxRadius` (30 for free) | `sliderMax = 100` (always show full scale up to PRO limit) |
| Slider only goes to 30 for free users | Slider shows full scale, but values above maxRadius trigger upgrade |
| Markers at 5mi, 30mi FREE, 100mi PRO evenly spaced | Markers positioned proportionally (30% for 30mi, 100% for 100mi) |

```typescript
// New slider approach
const displayMax = 100; // Always show up to PRO scale
const freeLimit = 30;

const handleSliderChange = (values: number[]) => {
  const newRadius = values[0];
  if (newRadius > maxRadius) {
    onUpgradeClick(); // Trigger upgrade if exceeding tier limit
  } else {
    onRadiusChange(newRadius);
  }
};
```

### MarketplaceCompaniesTable.tsx Changes

| Current Behavior | New Behavior |
|-----------------|--------------|
| `if (company.distance === null) return true` | `if (company.distance === null) return false` OR show separately |
| Shows all companies regardless of coordinates | Only shows companies within radius (if they have coords) |
| Distance column shows "-" for null | Shows "Calculating..." or "N/A" with tooltip |

Option A (stricter): Exclude companies without coordinates from radius filtering
```typescript
.filter(company => {
  if (company.distance === null) return false; // Exclude companies without coords
  return company.distance <= currentRadius;
})
```

Option B (flexible): Show companies without coordinates at the bottom with a note
```typescript
// Separate into two groups: with distance, without distance
const withCoords = filtered.filter(c => c.distance !== null && c.distance <= currentRadius);
const withoutCoords = filtered.filter(c => c.distance === null);
// Display withCoords first, then withoutCoords with a separator
```

---

## Implementation Steps

1. **Update `MarketplaceRadiusControl.tsx`**:
   - Change slider scale to always show 100 miles (or 500 for enterprise)
   - Position tier markers proportionally
   - Handle upgrade trigger when exceeding tier limit

2. **Update `MarketplaceCompaniesTable.tsx`**:
   - Change distance filter logic to exclude (or separate) companies without coordinates
   - Add visual indicator for companies awaiting geocoding

3. **Future: Geocode marketplace data**:
   - Create edge function to batch geocode company addresses
   - Update marketplace_companies table with lat/lng values
   - This makes the radius filter fully functional

---

## Expected Outcome

After these changes:
- Slider will show a 5-100 mile scale with "30 mi FREE" at the 30% mark and "100 mi PRO" at the right
- Free users can adjust radius from 5-30 miles
- Attempting to go past 30 miles shows upgrade modal
- Companies without lat/lng coordinates won't bypass the distance filter
- Clear visual distinction between companies with/without distance data
