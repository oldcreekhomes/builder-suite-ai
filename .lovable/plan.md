# Plan: Add First-Name Search to Schedule Resources

## Context
In the schedule's **ResourcesSelector** dropdown, the search currently matches by company name only (e.g., typing "Lynn" finds reps from Lynn Wholesale Flooring). The user wants to **also** match by a person's first name (e.g., typing "John" finds "John Smith"), without changing anything else.

## Scope Guarantee (no behavior changes)
The list of reps already shown in the dropdown is unchanged. It continues to come from `useProjectResources`, which already restricts results to:
- Representatives belonging to companies owned by the current home builder, AND
- Reps with `receive_schedule_notifications = true`, AND
- Reps whose service areas include the project's region (when set).

The new first-name match only filters within this already-restricted list. Internal users (your own teammates) remain searchable as today.

## What Will Change
**File: `src/components/schedule/ResourcesSelector.tsx`** — update the `filter` function on the `<Command>` component.

- Current: matches only `value.split('||')[0]` (company name) with `startsWith`.
- New: matches if the search term `startsWith` ANY of:
  1. Company name (existing behavior — unchanged)
  2. Full resource name (e.g. "John Smith")
  3. First name only (first whitespace-separated token of the resource name)

The `CommandItem` value format stays `companyName||resourceName||resourceId`, so no other code is affected.

## What Will NOT Change
- Which reps appear in the dropdown (still owned-company + opt-in + region-filtered).
- The existing company-name search.
- Group headings, selection logic, value persistence, UI layout.
- No database, RLS, or API changes.