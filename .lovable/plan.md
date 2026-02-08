
# Fix Google Places Integration for HQ Address Setup

## Problem Identified

The "Set Up Your Headquarters" modal and Company Profile settings page cannot search for addresses because:

1. **No Google Maps API loading** - Both `SetupHQModal.tsx` and `CompanyProfileTab.tsx` assume `window.google.maps.places` is already available globally, but nothing loads the Google Maps JavaScript API on these pages

2. **Missing API key secret** - The `GOOGLE_MAPS_DISTANCE_MATRIX_KEY` is not configured in the project secrets, so even if the API loading code were present, it would fail

## Solution

### Part 1: Add Google Maps API Key

You need to add the `GOOGLE_MAPS_DISTANCE_MATRIX_KEY` secret to the project:

1. Go to your Google Cloud Console
2. Enable the **Places API** and **Maps JavaScript API**
3. Create or use an existing API key with these APIs enabled
4. Add the secret in Lovable: Settings > Secrets > Add `GOOGLE_MAPS_DISTANCE_MATRIX_KEY`

### Part 2: Create Reusable Google Places Hook for Address Input

Create a new hook `useGooglePlacesAddress` that:
- Fetches the API key from the edge function
- Loads the Google Maps JavaScript API if not already loaded
- Initializes autocomplete on the provided input ref
- Parses address components into structured fields (street, city, state, zip, lat, lng)

### Part 3: Update SetupHQModal

Modify to:
- Use the new `useGooglePlacesAddress` hook
- Show loading state while Google API loads
- Display error message if API key is missing

### Part 4: Update CompanyProfileTab

Same changes as SetupHQModal:
- Use the new `useGooglePlacesAddress` hook
- Handle loading and error states

---

## Technical Implementation

### New Hook: useGooglePlacesAddress

```typescript
// src/hooks/useGooglePlacesAddress.ts

export function useGooglePlacesAddress(inputRef: RefObject<HTMLInputElement>, open: boolean) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<AddressData | null>(null);
  
  // 1. Fetch API key from edge function
  // 2. Load Google Maps script if not present
  // 3. Initialize autocomplete on inputRef
  // 4. Parse place_changed events into structured address data
  
  return { isLoading, error, selectedPlace, isGoogleLoaded };
}
```

### Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useGooglePlacesAddress.ts` | NEW - Reusable hook for address autocomplete |
| `src/components/marketplace/SetupHQModal.tsx` | Use new hook, add loading/error states |
| `src/components/settings/CompanyProfileTab.tsx` | Use new hook, add loading/error states |

---

## User Action Required

Before the code changes can work, you must add the Google Maps API key:

1. Ensure your Google Cloud project has:
   - Places API enabled
   - Maps JavaScript API enabled
   
2. Add the secret to this Lovable project:
   - Key name: `GOOGLE_MAPS_DISTANCE_MATRIX_KEY`
   - Value: Your Google Maps API key

---

## Flow After Fix

```
User opens Marketplace
        ↓
SetupHQModal appears (no HQ set)
        ↓
Hook fetches API key from edge function
        ↓
Google Maps JavaScript API loads
        ↓
Autocomplete initializes on address input
        ↓
User types "228 S Washington Street"
        ↓
Google Places dropdown appears with suggestions
        ↓
User selects address
        ↓
Fields auto-populate: street, city, state, zip, lat/lng
        ↓
User clicks "Continue to Marketplace"
        ↓
HQ saved → Marketplace filters to 30-mile radius
```
