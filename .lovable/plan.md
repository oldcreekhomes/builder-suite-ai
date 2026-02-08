

# Improve Marketplace Table Spacing & Monthly Sync Strategy

## Overview

This plan addresses two requests:
1. **Better table spacing** - Distribute columns more evenly to reduce white space
2. **Monthly sync strategy** - Cost-effective approach at ~$1/month

---

## Part 1: Table Column Spacing Fix

### Current Problem

Looking at the screenshot, the Location column is taking up 60%+ of the table width while Company Name, Rating, Phone, and Website are all cramped. This is because no explicit column widths are set.

### Solution: Set Explicit Column Widths

Apply percentage-based widths to distribute space evenly:

| Column | Current Width | New Width |
|--------|---------------|-----------|
| Company Name | Auto (small) | **20%** |
| Location | Auto (huge) | **40%** |
| Rating | Auto (small) | **12%** |
| Phone | Auto (small) | **16%** |
| Website | Auto (small) | **12%** |

### Implementation

Add `w-` classes to `TableHead` and optionally `TableCell` elements:

```tsx
<TableHead className="h-8 px-2 py-1 text-xs font-medium w-[20%]">Company Name</TableHead>
<TableHead className="h-8 px-2 py-1 text-xs font-medium w-[40%]">Location</TableHead>
<TableHead className="h-8 px-2 py-1 text-xs font-medium w-[12%]">Rating</TableHead>
<TableHead className="h-8 px-2 py-1 text-xs font-medium w-[16%]">Phone</TableHead>
<TableHead className="h-8 px-2 py-1 text-xs font-medium w-[12%]">Website</TableHead>
```

Also add `table-fixed` class to the Table component to enforce these widths.

---

## Part 2: Monthly Sync Strategy

### Cost Analysis

| Frequency | API Calls | Cost/Sync | Annual Cost |
|-----------|-----------|-----------|-------------|
| Daily | 250 | $4.25 | $1,551 |
| Weekly | 250 | $4.25 | $221 |
| **Monthly** | 250 | $4.25 | **$51/year** |

**Monthly sync = ~$4.25/month** - very cost effective!

### How It Works

1. **Set up a monthly cron job** using `pg_cron` to trigger the `populate-marketplace` function on the 1st of each month
2. The function refreshes all companies from Google Places API with the latest ratings, phone numbers, and addresses
3. **Data is at most 30 days old** - acceptable for business listings that rarely change

### Implementation

Run a SQL command to schedule the monthly job:

```sql
SELECT cron.schedule(
  'monthly-marketplace-refresh',
  '0 2 1 * *',  -- 2 AM on the 1st of every month
  $$
  SELECT net.http_post(
    url := 'https://nlmnwlvmmkngrgatnzkj.supabase.co/functions/v1/populate-marketplace',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ANON_KEY"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
```

---

## File to Modify

| File | Changes |
|------|---------|
| `src/components/marketplace/MarketplaceCompaniesTable.tsx` | Add explicit column widths with `w-[%]` classes |

---

## Result

- **Balanced column layout** - No more excessive white space in Location column
- **Monthly data refresh** - Fresh data at ~$4/month instead of $4,000/month
- **Clean, professional table** - Proportional spacing across all columns

