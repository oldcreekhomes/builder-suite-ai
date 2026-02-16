

## Standardize Empty States for Accounting Alerts and Recent Photos

### Changes

**1. `src/components/ProjectWarnings.tsx` (Accounting Alerts)**
- Replace the plain text "No pending warnings" (lines 69-72) with the same centered layout used by Project Bids and Insurance Alerts:
  - Green `CheckCircle2` icon (h-8 w-8)
  - Bold title: **"All Caught Up"**
  - Subtitle: "No pending accounting alerts"

**2. `src/components/RecentPhotos.tsx` (Recent Photos)**
- Replace the current empty state (lines 23-28) with the same centered layout, but using a red X instead of a green check:
  - Red `XCircle` icon (h-8 w-8, text-red-500)
  - Bold title: **"No Photos"**
  - Subtitle: "Add photos to a project to see them here"

### Visual Pattern (matching Project Bids / Insurance Alerts)
```text
+---------------------------+
|  [icon]                   |
|  Title (font-medium)      |
|  subtitle (muted, xs)     |
+---------------------------+
```

Both empty states will be vertically and horizontally centered within the card body, matching the existing pattern exactly.
