
Goal: Make the HQ modal’s Google address selection work exactly like the “Add Company” flow (reliable click-to-select inside Radix Dialog), without going in circles.

What I found (why “nothing happens”):
- The “Add Company” flow works because it relies on the normal Google Autocomplete `place_changed` flow and Radix Dialog’s guards (in `src/components/ui/dialog.tsx`) that explicitly treat `.pac-container` / `.pac-item` as “inside” the dialog, preventing the dialog from interfering.
- Our HQ hook (`useGooglePlacesAddress`) currently adds a document-level capture listener that calls `stopPropagation()` on `.pac-item` clicks. In practice, this can block Google’s own internal event handling, so the Autocomplete selection never completes and `place_changed` may never fire. That matches your symptom: dropdown shows, click does nothing.

High-confidence fix:
- Remove (or disable) the document-level `.pac-item` click interception from `useGooglePlacesAddress`.
- Rely on the same mechanism that already makes “Add Company” work:
  - Radix DialogContent’s `isInsideNestedOverlay()` already whitelists `.pac-container` and `.pac-item`, so the dialog should not close or steal focus when clicking suggestions.
  - Let Google handle the click normally so `place_changed` fires reliably.

Implementation plan (code changes)

1) Refactor `src/hooks/useGooglePlacesAddress.ts` to match the “Add Company” approach
   A. Remove the entire “document-level click handler for pac-items” effect that does:
      - `document.addEventListener('mousedown' / 'pointerdown', ..., true)`
      - `e.stopPropagation()`
      - the “setTimeout then getPlace” fallback
   B. Keep initialization timing retries (the “attempts/maxAttempts” logic) since that is also used in `useGooglePlaces`.
   C. Keep (or simplify) fallbacks:
      - Primary: Autocomplete `place_changed` → `autocomplete.getPlace()`
      - If `place.address_components` missing but `place.place_id` exists, use Geocoder `geocode({ placeId })` to get address components.
      - (Optional) Avoid depending on `PlacesService.getDetails()` for HQ since:
        - Console warning indicates PlacesService is “legacy” for new customers, and we don’t need establishment details here.
        - Add Company does not depend on PlacesService and works fine.
   D. Add very explicit logs (temporarily) to confirm:
      - `place_changed` fired
      - `place.place_id` present
      - component counts
      - lat/lng extraction success
      This makes it immediately obvious what’s happening if anything still fails.

2) Confirm the HQ modal uses the same “uncontrolled input” behavior
   - SetupHQModal’s `<Input ref={inputRef} ... />` is already uncontrolled (no `value` prop), which is good.
   - We will ensure we do not programmatically fight Google’s input updates (no manual clearing, no stopPropagation). Add Company works without that.

3) Validate Dialog stability (already in place)
   - `src/components/ui/dialog.tsx` already protects `.pac-container` and `.pac-item` via `isInsideNestedOverlay()`.
   - No changes required there unless we discover a different Radix overlay is interfering.

4) Testing checklist (end-to-end, same as your expectation)
   - Go to `/marketplace`
   - Modal opens: “Set Up Your Headquarters”
   - Type “228 s washing…”
   - Click a suggestion
   - Verify in console:
     - `place_changed event fired` appears
     - address components are parsed
     - lat/lng are set
   - Verify UI updates:
     - Street/City/State/ZIP preview box populates
     - “Continue to Marketplace” button becomes enabled
   - Click “Continue to Marketplace”
   - Confirm HQ saves and modal closes

If it still fails after this change (unlikely, but prepared)
- Next step would be to replicate StructuredAddressInput’s exact selection pipeline in HQ:
  - Remove PlacesService
  - Use Geocoder fallback only
  - Ensure `onPointerDownOutside/onInteractOutside` guards are not overridden anywhere in the modal
- I’d also add a small on-screen debug indicator in the modal (“Google selected place received”) to avoid relying on console.

Files to be edited
- `src/hooks/useGooglePlacesAddress.ts`
  - Remove document capture click interception
  - Simplify place processing to mirror Add Company’s working pattern
  - Keep Geocoder fallback
  - Keep initialization retry logic

No other file changes should be necessary to make clicking work, since SetupHQModal is already wired to `onPlaceSelected`.

Success criteria
- Clicking a Google suggestion populates HQ fields on the first click, consistently, inside the HQ dialog (same behavior as Add Company).
