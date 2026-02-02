

# Add Date Range Filter to Vendor Payments Report

## Overview

Replace the current single "As of" date picker with a more flexible date range filter that supports:
1. **Custom Date Range**: Start date and End date pickers
2. **Year Preset**: Quick select for full calendar years (January 1 - December 31)

This will allow filtering transactions within a specific date range rather than just "as of" a certain date.

---

## UI Design

The filter section will look like this:

```
+------------------------------------------------------------------+
|  Year: [2026 ▼]   From: [01/01/2026]  To: [12/31/2026]           |
|  [Expand All]  [Collapse All]                      [Export PDF]   |
+------------------------------------------------------------------+
```

**Behavior:**
- Selecting a year from the dropdown auto-sets From = Jan 1 and To = Dec 31 of that year
- Users can manually adjust the From/To dates for custom ranges
- When custom dates are entered, the year dropdown shows the matching year (or "Custom" if it doesn't match a full year)

---

## Implementation Steps

### Step 1: Update `VendorPaymentsContent.tsx`

**Changes:**
- Replace single `asOfDate` state with `startDate` and `endDate`
- Add year selector dropdown (showing years 2020 - current year + 1)
- Add "From" and "To" date pickers
- Default to current full year (Jan 1 - Dec 31, current year)
- Update PDF export to reflect the date range

**New State:**
```typescript
const currentYear = new Date().getFullYear();
const [startDate, setStartDate] = useState<Date>(new Date(currentYear, 0, 1));
const [endDate, setEndDate] = useState<Date>(new Date(currentYear, 11, 31));
const [selectedYear, setSelectedYear] = useState<number | 'custom'>(currentYear);
```

**Year Options:**
- 2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027 (dynamic based on current year)

### Step 2: Update `useVendorPaymentsReport.ts`

**Changes:**
- Accept `startDate` and `endDate` parameters instead of single `asOfDate`
- Apply date range filters (>= startDate AND <= endDate) to all queries:
  - Bills: filter by `bill_date`
  - Bill Payments: filter by `payment_date`  
  - Checks: filter by `check_date`

**Updated Query Key:**
```typescript
queryKey: ['vendor-payments-report', effectiveOwnerId, startDate?.toISOString(), endDate?.toISOString()]
```

### Step 3: Update `VendorPaymentsPdfDocument.tsx`

**Changes:**
- Update props to accept `startDate` and `endDate` strings
- Update header to show "January 1, 2026 - December 31, 2026" format
- Update filename to include date range

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/reports/VendorPaymentsContent.tsx` | Add year dropdown, replace single date with start/end pickers |
| `src/hooks/useVendorPaymentsReport.ts` | Change parameter from `asOfDate` to `startDate`/`endDate`, apply range filters |
| `src/components/reports/pdf/VendorPaymentsPdfDocument.tsx` | Update header to show date range |

---

## Technical Details

### Year Dropdown Logic

```typescript
// When year is selected:
const handleYearChange = (year: number) => {
  setSelectedYear(year);
  setStartDate(new Date(year, 0, 1));  // Jan 1
  setEndDate(new Date(year, 11, 31));  // Dec 31
};

// When custom dates are entered:
const handleStartDateChange = (date: Date) => {
  setStartDate(date);
  // Check if dates now match a full year
  updateSelectedYearIfFullYear(date, endDate);
};
```

### Query Filter Changes

**Current (single date):**
```typescript
billsQuery = billsQuery.lte('bill_date', dateFilter);
```

**New (date range):**
```typescript
if (startDateFilter) {
  billsQuery = billsQuery.gte('bill_date', startDateFilter);
}
if (endDateFilter) {
  billsQuery = billsQuery.lte('bill_date', endDateFilter);
}
```

---

## Default Behavior

On page load:
- Year dropdown shows current year (2026)
- Start date: January 1, 2026
- End date: December 31, 2026
- All transactions within that range are displayed

