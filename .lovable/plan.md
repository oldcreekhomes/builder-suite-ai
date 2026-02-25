

## Make Delete Buttons Consistent Using the Existing `DeleteButton` Component

### Problem
The trash icon in the Price History Manager uses a raw `<button>` element with a browser `confirm()` dialog, which looks unstyled and inconsistent with the rest of the app. The app already has a reusable `DeleteButton` component (`src/components/ui/delete-button.tsx`) that provides:
1. Red-colored trash icon
2. A styled confirmation dialog (not a browser `confirm()`)
3. Loading state while deleting

### Solution
Replace the custom trash button in `PriceHistoryManager.tsx` with the existing `DeleteButton` component. No need to create a new style folder -- the reusable component already exists, it just was not used here.

### Changes

**File: `src/components/settings/PriceHistoryManager.tsx`**

1. Import `DeleteButton` from `@/components/ui/delete-button`
2. Remove the `confirm()` call from `handleDeletePriceEntry` (the `DeleteButton` handles confirmation)
3. Replace the raw `<button>` + `Tooltip` block (lines 480-494) with:
```tsx
<DeleteButton
  onDelete={() => handleDeletePriceEntry(entry)}
  title="Delete Price Entry"
  description="Are you sure you want to delete this price history entry? This cannot be undone."
  size="icon"
  variant="ghost"
  isLoading={deletingEntryId === entry.id}
/>
```

This ensures every delete action in the app uses the same red trash icon, styled confirmation dialog, and loading state -- no new files or "style folder" needed since the `DeleteButton` component already serves as that standard template.

### Files Changed
| File | Change |
|------|--------|
| `src/components/settings/PriceHistoryManager.tsx` | Replace raw button with `DeleteButton` component, remove `confirm()` from handler |

