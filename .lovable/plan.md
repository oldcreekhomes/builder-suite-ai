

## Fix Price History Graph to Use Actual Dates

### Problem
The price history chart currently:
- Plots data on the 15th of each month (arbitrary), missing the actual dates prices changed
- Extends 3 months into the future beyond today
- Doesn't mark the real dates of price changes (e.g., Jun 22 and Jan 16)

### Fix

**File: `src/components/settings/PriceHistoryModal.tsx`** -- rewrite `generateHistoricalChartData()`

Replace the monthly-interpolation approach with an event-driven approach:

1. **Plot actual price change dates** -- each history entry gets a data point at its real date (e.g., "Jun 22, 2025", "Jan 16, 2026")
2. **End at today** -- add a final data point for today's date (Feb 25, 2026) using the most recent price, and do NOT extend into the future
3. **Carry price forward** -- between price change events, add a point just before the next change to show the "step" visually (the flat line then drop pattern seen in the screenshot)

The resulting data points for the example would be:
- Jun 22, 2025: $4,000 (first price)
- Jan 15, 2026: $4,000 (day before change, carries forward)
- Jan 16, 2026: $2,900 (price change)
- Feb 25, 2026: $2,900 (today, carries forward)

The X-axis labels will use `format(date, 'MMM dd')` or similar to show actual dates rather than just month abbreviations.

### Technical Details

| Area | Change |
|------|--------|
| `generateHistoricalChartData()` | Replace monthly loop with event-based data points at actual change dates, with carry-forward points and today as the endpoint |
| X-axis format | Update date format string to show day precision (e.g., "Jun 22") |
| Chart tooltip | `fullDate` will show the exact date for hover context |
| Future extension removed | No more `latestDate.setMonth(+3)` -- graph ends at today |

### Files Changed
| File | Change |
|------|--------|
| `src/components/settings/PriceHistoryModal.tsx` | Rewrite `generateHistoricalChartData()` to use actual dates and end at today |

