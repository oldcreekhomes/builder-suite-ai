

## Split Info Row into 3 Side-by-Side Tables

### What's Changing

Replace the single `<Table>` (lines 309-370) with a `grid grid-cols-3 gap-4` containing three independent `<div className="border rounded-lg"><Table>` blocks — one per section. Each gets equal 1/3 width.

### Layout

```text
┌─ 1/3 ──────────────┐  ┌─ 1/3 ──────────────┐  ┌─ 1/3 ──────────────┐
│ Historical Pricing  │  │ Adjustment          │  │ Cost Code Breakdown │
├─────────────────────┤  ├─────────────────────┤  ├─────────────────────┤
│ 415 E Nelson        │  │ [100] %  $5,620.00  │  │ 4820.1 Gates  $450  │
│ $5,620.00           │  │                     │  │ 4820.2 Fence $27.50 │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
```

### Changes (single file)

**`src/components/bidding/BidPackageDetailsModal.tsx`** lines 308-370:

- Wrap in `<div className={cn("grid gap-4", historicalProjectAddress ? "grid-cols-3" : "grid-cols-2")}>`
- Each section becomes its own `<div className="border rounded-lg"><Table>` with its own `TableHeader`/`TableBody`
- **Adjustment cell**: move the `$` amount inline with the input (`flex items-center gap-2`) instead of below it — so `[100] % $5,620.00` all on one line
- Historical table only rendered when `historicalProjectAddress` exists; grid shifts to `grid-cols-2` otherwise

