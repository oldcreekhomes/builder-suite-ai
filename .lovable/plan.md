
# Fix Project-Specific Header Alignment

## Problem
`DashboardHeader.tsx` has two code paths with different padding:
- Non-project pages (line 108): `py-3.5` -- correct, aligned
- Project-specific pages (line 56): `py-2` -- misaligned

This single discrepancy causes every project sub-page (Files, Photos, Budget, Bidding, Purchase Orders, Schedule, Reports, Transactions) to have a misaligned header.

## Fix
One change in `src/components/DashboardHeader.tsx`, line 56:

Change `py-2` to `py-3.5`

```
// From:
<header className="bg-white border-b border-border px-6 py-2">

// To:
<header className="bg-white border-b border-border px-6 py-3.5">
```

This makes both code paths identical in padding, so every page in the app uses the same header height and border alignment as the company dashboard and settings pages.
