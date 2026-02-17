

## Standardize ALL Bill Tables to Default shadcn/ui Styling

### Problem
Six different bill tables have six different styling approaches. The project standard is **default shadcn/ui** (`h-10 px-2` for `TableHead`, `p-2` for `TableCell`, no custom row heights or backgrounds). The "Enter with AI" table (`BatchBillReviewTable`) is actually the one deviating with custom compact styles (`h-8` header rows, `px-2 py-0 text-xs font-medium` headers, `bg-muted/30` row backgrounds, `px-2 py-1 text-xs` cells).

### What Changes

#### 1. `BatchBillReviewTable.tsx` (Enter with AI tab) -- the big one
- Remove `className="h-8"` from both header `TableRow` elements (lines 514, 556)
- Remove `px-2 py-0 text-xs font-medium` from all `TableHead` elements, keeping only width/alignment classes (lines 515-532, 557-583)
- Remove `className="h-10 bg-muted/30 hover:bg-muted/50"` from data `TableRow` (line 668), use no custom class
- Change all `TableCell` from `className="px-2 py-1 text-xs ..."` to just `className="..."` (keep only width classes), letting the default `p-2` apply

#### 2. `BillsApprovalTable.tsx` (Rejected, NRAI, Paid tabs)
- Remove `className="h-10"` from data `TableRow` (line 727)
- Change all `TableCell` from `className="px-2 py-1 text-xs ..."` to remove the custom padding/font overrides, keeping only width/truncation classes

#### 3. `PayBillsTable.tsx` (Approved tab)
- Remove `className="h-10"` from data `TableRow` (line 913)
- Change all `TableCell` from `className="px-2 py-1 text-xs ..."` to remove the custom padding/font overrides, keeping only width classes

#### 4. `BillsReviewTable.tsx` (Review tab)
- Already uses default shadcn/ui styling -- no changes needed

#### 5. `BillsReviewTableRow.tsx` (Review tab rows)
- Already uses default styling -- no changes needed

### Technical Summary
- **Headers**: All `TableHead` elements use only width/alignment classes (e.g., `w-44`, `text-center`). No `px-2 py-0 text-xs font-medium` overrides.
- **Header rows**: No `h-8` or any height class. Default `h-10` comes from the `TableHead` component itself.
- **Data rows**: No `h-10`, no `bg-muted/30`. Just default `TableRow` styling.
- **Data cells**: No `px-2 py-1 text-xs`. Default `p-2` from `TableCell` component. Keep only structural classes like widths (`w-44`), truncation (`truncate`), and alignment (`text-center`, `whitespace-nowrap`).

### Result
Every bill table (Enter with AI, Review, Rejected, Approved, Paid, NRAI) will render with identical default shadcn/ui table styling -- same header height, same font size, same cell padding, same row backgrounds -- matching the rest of the application.

