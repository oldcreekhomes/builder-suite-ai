## Goal
Reorganize the Project Manager dashboard grid in `src/pages/Index.tsx` so the Accounting Alerts card has enough horizontal room to display the new "Approved" date picker column.

## New layout (4 columns × 2 rows)

```text
┌──────────────┬──────────────┬──────────────┬──────────────┐
│              │ Project Bids │  Insurance   │              │
│  My Projects │  (short)     │  Alerts      │  Recent      │
│  (full       ├──────────────┴──────────────┤  Photos      │
│   height)    │   Accounting Alerts          │  (full       │
│              │   (spans 2 columns)          │   height)    │
└──────────────┴──────────────────────────────┴──────────────┘
```

- **Insurance Alerts** moves up to the top of column 3 (where Accounting Alerts used to be).
- **Project Bids** is shortened to match Insurance Alerts' height so their tops/bottoms align.
- **Accounting Alerts** moves to a wider row below, spanning columns 2–3, giving room for Address | Current | Late | Approved (date picker).
- **My Projects** (col 1) and **Recent Photos** (col 4) remain full height.

## Implementation

Edit only the PM dashboard grid block in `src/pages/Index.tsx` (lines ~65–85). Replace the single `md:grid-cols-4` flex stack with an explicit 4-col × 2-row CSS grid:

- `grid-cols-4`, `grid-rows-2`, fixed total height (keep `calc(100vh - 220px)`).
- `MyProjectsCard`: `col-start-1 row-span-2`.
- `ProjectBidsCard`: `col-start-2 row-start-1`.
- `InsuranceAlertsCard`: `col-start-3 row-start-1`.
- `ProjectWarnings` (Accounting Alerts): `col-start-2 col-span-2 row-start-2`.
- `RecentPhotos` wrapper: `col-start-4 row-span-2`.

Each cell uses `h-full min-h-0` so children fill correctly. No changes to the cards themselves — the existing `ProjectWarnings` Approved date-picker column will now be visible because the card is roughly twice as wide.

## Out of scope
- No changes to card internals, data hooks, or other dashboard views (owner/accountant).
- No changes to the Weather Forecast row below.
