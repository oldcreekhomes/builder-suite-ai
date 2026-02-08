
# Fix HQ Modal Google Places Selection

## Root Cause

The Google Places dropdown IS loading and showing suggestions (as seen in your screenshot), but clicking on a suggestion doesn't populate the form fields. This is because:

1. The `useGooglePlacesAddress` hook relies solely on the `place_changed` event, which can be unreliable in modal contexts
2. The dialog's event handling (pointer down outside, focus outside) may be intercepting clicks before Google can process them
3. Missing fallback strategies that the working `StructuredAddressInput` and `useGooglePlaces` hooks have

## Solution

Refactor `useGooglePlacesAddress` to match the proven patterns from:
- `src/hooks/useGooglePlaces.ts` (used by AddCompanyDialog - works)
- `src/components/StructuredAddressInput.tsx` (works with robust fallbacks)

### Key Changes

1. **Add PlacesService + Geocoder fallbacks** - Like StructuredAddressInput, use getDetails() first, then Geocoder if that fails

2. **Add document-level click handler for pac-items** - Capture clicks on Google's dropdown items directly, bypassing potential modal interference

3. **Request more fields** - Include `name`, `formatted_address`, `place_id` in addition to `address_components` and `geometry`

4. **Better initialization timing** - Ensure the autocomplete is properly bound after modal animation completes

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useGooglePlacesAddress.ts` | Add PlacesService/Geocoder fallbacks, document click handler, improved field requests |
| `src/components/marketplace/SetupHQModal.tsx` | Minor adjustments if needed for event handling |

## Technical Implementation

```typescript
// Key additions to useGooglePlacesAddress.ts:

// 1. Add PlacesService and Geocoder refs
const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
const geocoderRef = useRef<google.maps.Geocoder | null>(null);

// 2. In initializeAutocomplete, create service instances
const serviceDiv = document.createElement('div');
placesServiceRef.current = new window.google.maps.places.PlacesService(serviceDiv);
geocoderRef.current = new window.google.maps.Geocoder();

// 3. Request more fields
autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
  types: ['address'],
  componentRestrictions: { country: 'us' },
  fields: ['address_components', 'geometry', 'place_id', 'formatted_address', 'name']
});

// 4. Use getDetails() with Geocoder fallback in place_changed handler
autocompleteRef.current.addListener('place_changed', () => {
  const place = autocompleteRef.current?.getPlace();
  if (place?.place_id) {
    // Try PlacesService.getDetails() first
    placesServiceRef.current.getDetails(
      { placeId: place.place_id, fields: ['address_components', 'geometry'] },
      (details, status) => {
        if (status === 'OK' && details?.address_components) {
          processAddressComponents(details);
        } else {
          // Fallback to Geocoder
          geocoderRef.current.geocode({ placeId: place.place_id }, ...);
        }
      }
    );
  }
});

// 5. Add document click handler for pac-items
document.addEventListener('mousedown', (e) => {
  const pacItem = (e.target as HTMLElement).closest('.pac-item');
  if (pacItem) {
    e.stopPropagation();
    // Let Google process, then check for place data
  }
}, true);
```

## Expected Outcome

After this fix:
1. User types address in HQ modal
2. Google suggestions appear (already working)
3. User clicks suggestion
4. Click is captured before modal can interfere
5. PlacesService.getDetails() fetches full address data
6. If that fails, Geocoder provides fallback
7. Address fields populate with street, city, state, zip, lat/lng
8. User clicks "Continue to Marketplace"
9. HQ is saved and marketplace filters to 30-mile radius

## Secret Requirement

The `GOOGLE_MAPS_DISTANCE_MATRIX_KEY` must be added to project secrets with:
- Places API enabled
- Maps JavaScript API enabled

Go to **Settings > Secrets** and add this key before testing.
