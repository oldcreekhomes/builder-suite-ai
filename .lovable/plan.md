

## UI Polish: Widen PO Dialog and Unify Green Color Scheme

### Changes

**File: `src/components/bills/PODetailsDialog.tsx`**

1. **Widen dialog** -- Change `max-w-2xl` to `max-w-4xl` on line 115 so all columns fit on one line without wrapping.

2. **Change "This Bill" from blue to green** -- Update all blue styling to green to match the existing billing highlight style:
   - Line 145: Summary header "This Bill" amount: `text-blue-600` to `text-green-700`
   - Line 206: Line item pending amounts: `text-blue-600 bg-blue-50` to `text-green-700 bg-green-100`
   - Line 248: Totals row pending total: `text-blue-600` to `text-green-700`

### Result

- Dialog is wide enough for Description, Cost Code, PO Amount, Billed, This Bill, and Remaining to all fit on a single line
- "This Bill" column values use the same green color as the "Billed" highlights and "Remaining" values, creating a uniform look

