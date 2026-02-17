

## Fix Insurance Alerts Card: Truncation + Scroll

### Problem
1. Long company names like "Airtron Heating & Air Conditioning/Masters Inc..." run off the card edge
2. When there are many alerts, the list overflows the card instead of scrolling

### Changes (single file: `src/components/InsuranceAlertsCard.tsx`)

**1. Truncate company names with hover tooltip**
- Wrap the company name text in a `title` attribute so users can hover to see the full name
- The `truncate` class is already applied, but the flex layout may not be constraining it properly -- ensure `min-w-0` is on the parent flex container

**2. Ensure scroll works within the fixed card height**
- The card is inside a grid with a fixed height (`calc(100vh - 220px)`) on the dashboard, and the card has `h-full flex flex-col`
- The `ScrollArea` needs its parent `CardContent` to enforce a bounded height so overflow triggers scrolling
- Add `min-h-0` to the `CardContent` so flex shrinking works and the ScrollArea can scroll

