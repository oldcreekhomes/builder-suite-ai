

## Options for Specifications & Files in the Management Table

### The Problem
Specifications (a single paperclip icon) and Files (file icons + "Add Files" button) are squeezed into narrow table columns that look awkward — the icon sits alone in a cramped cell, and the files spill out unevenly.

### Recommended Option: Move Specs & Files Below the Table as an Inline Toolbar

Instead of cramming these into table columns, pull them out of the 6-column table entirely and render them as a clean horizontal toolbar row just below the table:

```text
┌──────────────────────────────────────────────────────────┐
│ Status      Due Date      Reminder               Actions │  ← 4-column table (clean, spacious)
│ [Sent ▾]   [04/16/2026]  [04/14/2026]              ···  │
└──────────────────────────────────────────────────────────┘
  📎 Specifications: View/Edit    📄 Files: plan.pdf  erosion.xlsx  [Add Files ▾]
```

- The table drops from 6 columns to 4 (Status, Due Date, Reminder, Actions) — all evenly spaced
- Specs and Files become a simple flex row underneath with proper breathing room
- The specs icon + label and file icons + "Add Files" button sit side by side naturally

### Implementation

**File: `src/components/bidding/BidPackageDetailsModal.tsx`**

1. Remove `Specifications` and `Files` `<TableHead>` entries (lines 216-217) — table becomes 4 columns
2. Remove `<BiddingTableRowSpecs>` and `<BiddingTableRowFiles>` from the `<TableRow>` (lines 262-275)
3. Add a new `<div>` right after the closing `</div>` of the table border container (after line 292), containing:
   - A flex row with the specs button/icon (extracted from BiddingTableRowSpecs logic) and the files section (extracted from BiddingTableRowFiles logic)
   - Both rendered as regular div children instead of TableCells
   - Styled with `flex items-center gap-6 px-4 py-2 border rounded-lg mt-2`

**Files: `BiddingTableRowSpecs.tsx` and `BiddingTableRowFiles.tsx`**

4. Add an optional `asDiv` prop (or create wrapper variants) that renders the content without `<TableCell>` wrapping, so they can be used outside a table context

### Result
- The top management table is clean with 4 evenly-spaced columns
- Specs and Files have proper room to breathe in their own row below
- File icons, delete buttons, and "Add Files" dropdown display without cramping

