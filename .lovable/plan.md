

## Standardize All Controls App-Wide (Two-Step Rollout)

### The Problem

Looking at the Bidding page screenshot, every control has different styling:
- **"Draft" status select**: `h-8`, default `text-sm`
- **Date pickers**: `h-8 text-sm font-normal` (overrides Button's default `font-medium`)
- **"Add Files" button**: `h-8 text-xs` (smaller text than everything else)
- **"No Historical" select**: `h-9 w-auto` (taller than row controls)
- **"Global Settings" / "Load Bid Packages"**: `variant="outline" size="sm"` (h-9, `text-sm font-medium` — the correct shadcn default)

The root cause: developers keep adding custom `className` overrides (`h-8`, `text-xs`, `font-normal`) that deviate from shadcn defaults. There is no enforced standard.

### The Standard (shadcn defaults — no overrides)

All interactive controls follow two tiers:

| Context | Button | Select | Input |
|---------|--------|--------|-------|
| **Header / toolbar** | `variant="outline" size="sm"` → h-9, text-sm, font-medium | `SelectTrigger` with `className="h-9"` | `className="h-9"` |
| **Table row inline** | `variant="outline" size="sm"` → h-9, text-sm, font-medium | `SelectTrigger` with `className="h-9"` | `className="h-9"` |

**The rule**: No `h-8`, no `text-xs`, no `font-normal` on buttons. Use `size="sm"` (h-9) everywhere. shadcn Button `size="sm"` already gives `text-sm font-medium` — never override it.

Date pickers that use `<Button variant="outline">` should use `size="sm"` and not override `font-normal` (the date text should look like any other button).

### Step 1: Fix Bidding Now (this implementation)

**Files to edit:**

1. **`src/components/bidding/components/BiddingTableRowFiles.tsx`** (line 131-134)
   - Remove `className="h-8 text-xs"` from "Add Files" button
   - Just use `variant="outline" size="sm"` with no className override

2. **`src/components/bidding/components/ProposalCell.tsx`** (line 70-73)
   - Same fix: remove `className="h-8 text-xs"` from "Add Files" button

3. **`src/components/bidding/components/BiddingTableRowSpecs.tsx`** (lines 38, 54)
   - Icon button: change `className="h-8 w-8 p-0"` → use `size="icon"` with `className="h-9 w-9"`
   - Text button: remove `className="h-8 text-xs px-2"`, use `size="sm"` only

4. **`src/components/bidding/components/BiddingDatePicker.tsx`** (line 79-81)
   - Change from `"w-full h-8 text-sm justify-start text-left font-normal max-w-[120px]"` to `size="sm"` + only layout overrides: `"w-full justify-start text-left max-w-[120px]"` with conditional `text-muted-foreground`

5. **`src/components/bidding/components/BiddingTableRowContent.tsx`** (line 103)
   - Status SelectTrigger: change `className="w-full h-8"` → `className="w-full h-9"`

6. **`src/components/bidding/BidPackageDetailsModal.tsx`** (line 224)
   - SelectTrigger inside modal: change `className="h-8 text-xs"` → `className="h-9"`

7. **`src/components/bidding/BiddingTable.tsx`** (line 222)
   - Historical SelectTrigger: already `h-9 w-auto` — correct, no change needed

### Step 2: Broader Cleanup (future pass)

After Bidding is standardized, do a sweep of the rest of the app using the same rules. This will be a separate task covering Budget, Bills, Settings, and other modules — applying the same "no custom height/font overrides" rule to every `<Button>`, `<SelectTrigger>`, and inline control.

### Files modified (Step 1)
- `src/components/bidding/components/BiddingTableRowFiles.tsx`
- `src/components/bidding/components/ProposalCell.tsx`
- `src/components/bidding/components/BiddingTableRowSpecs.tsx`
- `src/components/bidding/components/BiddingDatePicker.tsx`
- `src/components/bidding/components/BiddingTableRowContent.tsx`
- `src/components/bidding/BidPackageDetailsModal.tsx`

