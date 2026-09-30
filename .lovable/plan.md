# Split the Accountant Dashboard into Tabs

## Goal
The accountant dashboard currently crams Active Jobs, Multiple Project Entries, and Cash Position onto one screen. Split it into three tabs across the top so each view gets the full width of the page. The Owner dashboard stays exactly as it is.

## What you'll see
- Three tabs across the top of the accountant dashboard: **Active Jobs**, **Cash Position**, **Multiple Project Entries**
- **Active Jobs** (default): the jobs table, now using the full page width instead of sharing with a side column
- **Cash Position**: the cash position card on its own, centered at a comfortable reading width
- **Multiple Project Entries**: the deposits/checks entry card on its own
- Switching tabs is instant; the selected tab is remembered while you stay on the page

## Technical details
- Edit `src/pages/Index.tsx` only: wrap the accountant branch in the existing shadcn `Tabs` component (`Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`)
- Reuse the existing components unchanged: `AccountantJobsTable`, `CashPositionCard`, `MultipleProjectEntriesCard`
- Owner branch (lines 90-100) is untouched
- No database or data changes; both cards keep working exactly as they do today
- Verify with `bun run build:dev`
