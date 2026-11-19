# Always show "Add New Company" in the Received From / vendor search

## What's happening
- The "Add New Company" button only appears when the search finds **zero** matches.
- "IRS" is inside the word "St**airs**", so Century Stairs, Signature Stairs and Stairs Creations match, and the button is hidden.

## Fix
- Keep showing the matching companies as today.
- Add an "Add New Company "IRS"" button at the bottom of the list whenever something is typed and no company has that exact name.
- Clicking it opens the same add-company window you already use.
- This one search box is shared, so the fix also applies everywhere else you pick a vendor (checks, bills, credit cards).

## Technical
- `src/components/VendorSearchInput.tsx`: render the add button after the results when `searchQuery.trim()` is set and there's no case-insensitive exact name match; keep the existing "No vendors found" message for the zero-results case.
