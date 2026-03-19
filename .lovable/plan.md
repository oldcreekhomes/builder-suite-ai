
Implement a tighter Step 1 fix that actually enforces one control standard in Bidding instead of only partially cleaning it up.

1. Define one Bidding control standard based on shadcn defaults
- Buttons: `variant="outline" size="sm"` with no custom font/height classes
- Selects: `SelectTrigger className="h-9"` so they visually match `Button size="sm"`
- Inputs: `className="h-9"`
- Header actions: same icon rule, same text weight, same padding, same height
- Inline row controls: same height/typography as header controls unless truly icon-only

2. Fix the remaining Bidding controls that are still off-standard
- `src/components/bidding/BiddingTable.tsx`
  - Make the Historical select look like the adjacent header buttons
  - Remove visual differences causing lighter-looking text
  - Standardize icon treatment across header actions so “415 E Nelson”, “Global Settings”, and “Load Bid Packages” follow one pattern
- `src/components/bidding/components/BiddingCompanyRow.tsx`
  - Change the `will bid` select from `h-8` to `h-9`
  - Change the price input from `h-8` to `h-9`
- Re-check the already touched Bidding files for any remaining custom overrides that still create different font weight or padding

3. Fix address shortening with a real formatter, not just “drop the last word”
- Replace the current simplistic logic in `src/hooks/useHistoricalProjects.ts`
- Add a normalization helper that:
  - strips trailing city/state/ZIP
  - keeps street number + directional + street name
  - abbreviates street suffixes/directionals into a compact label
- Target output style like:
  - `895 Kentucky Street Arlington` → `895 Kentucky St`
  - `895 N Kentucky Street Arlington` → `895 N Kentucky St`
  - `1712 N. Quebec St. Arlington` → `1712 N Quebec St`
- Use that formatted value everywhere the Historical dropdown renders labels

4. Make the header controls truly uniform
- Pick one consistent header treatment and apply it across the three controls:
  - Historical select
  - Global Settings
  - Load Bid Packages
- Recommended standard: keep shadcn default sizing and typography, and use either:
  - no leading icons on any of them, or
  - leading icons on all of them with identical spacing
- The implementation should remove the current “one has icon / one does not / one looks lighter” mismatch

5. Broaden the audit for Step 2 readiness
- Search the rest of the app for the same anti-patterns:
  - `h-8`
  - `text-xs` on action controls
  - `font-normal` on button-like date pickers
  - custom trigger/input heights that drift from `h-9`
- Build a follow-up cleanup list by module so the same standard can be rolled out app-wide without changing behavior

Technical notes
- The current root causes are visible in code:
  - `SelectTrigger` default is `h-10`, while buttons use `size="sm"` = `h-9`
  - `src/components/bidding/components/BiddingCompanyRow.tsx` still contains `h-8`
  - `src/hooks/useHistoricalProjects.ts` still uses a weak “drop last word if 4+ words” rule, which is why addresses are not being shortened reliably
- The correct approach is not to invent per-screen styling; it is to normalize all Bidding controls onto the same shadcn baseline and use one shared address formatter for historical project labels

Files to update in the next implementation pass
- `src/components/bidding/BiddingTable.tsx`
- `src/components/bidding/components/BiddingCompanyRow.tsx`
- `src/hooks/useHistoricalProjects.ts`

Expected result
- “Draft”, calendar controls, Historical, Global Settings, and Load Bid Packages all share the same visual weight, height, padding, and typography
- Historical project labels become compact street-style labels such as `895 N Kentucky St`
- Bidding becomes the clean template for the broader app-wide control standardization pass
