

## Reorganize Bid Package Details Modal: Remove "Sent On" from Header, Add Per-Company "Sent On" Column

### What Changes

1. **Remove "Sent On" from the top management table** — the package-level `sent_on` date is redundant now that we track per-company send dates. Remove both the header column and the data cell. Redistribute spacing across the remaining columns (Status, Due Date, Reminder, Specifications, Files, Actions).

2. **Add "Sent On" column to the company table** — insert a new column between "PO Status" and "Will Bid" showing each company's `email_sent_at` date. This gives per-company visibility into when the bid was actually sent.

### Files Changed

**`src/components/bidding/BidPackageDetailsModal.tsx`**
- Remove `<TableHead>Sent On</TableHead>` (line 214) and the corresponding `<TableCell>` (lines 240-242) from the top management table
- The remaining 6 columns (Status, Due Date, Reminder, Specifications, Files, Actions) will naturally fill the space

**`src/components/bidding/BiddingCompanyList.tsx`**
- Add `<TableCell className="font-medium text-muted-foreground">Sent On</TableCell>` between "PO Status" and "Will Bid" in the header row (after line 149)

**`src/components/bidding/components/BiddingCompanyRow.tsx`**
- Add `email_sent_at` to the `BiddingCompany` interface
- Add a new `<TableCell>` between PO Status (line 118-124) and Will Bid (line 125-140) showing the formatted `email_sent_at` date, or "—" if null
- Color: green "Not sent" if null, red date text if sent (matching the Send modal pattern)

### Result
- Top header is cleaner — no misleading package-level "Sent On"
- Each company row shows its own actual sent date
- Clear red/green visual indicators per company

