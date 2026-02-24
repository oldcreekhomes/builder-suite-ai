

## Fix: Resources Not Loading in Schedule

### Problem
Every row in the schedule creates its own `ResourcesSelector`, each calling `useProjectResources(projectId)` independently. With 20+ visible rows, this fires 100+ simultaneous Supabase queries, causing silent failures and empty resource lists. Before the region filter was added, this same per-row pattern existed but was less likely to fail because there were fewer queries per call (no project lookup).

### Solution
Fetch resources **once** at the `CustomGanttChart` level and pass the data down as props. This reduces queries from 100+ to just 5.

```text
BEFORE (broken - N instances):
  CustomGanttChart
    UnifiedScheduleTable
      ResourcesSelector (row 1) -> useProjectResources() -> 5+ queries
      ResourcesSelector (row 2) -> useProjectResources() -> 5+ queries
      ... (20+ rows = 100+ queries)

AFTER (fixed - 1 instance):
  CustomGanttChart -> useProjectResources(projectId) -> 5 queries total
    UnifiedScheduleTable (receives resources prop)
      ResourcesSelector (row 1) -> uses prop directly
      ResourcesSelector (row 2) -> uses prop directly
      ... (0 additional queries)
```

### Changes

#### 1. `src/components/schedule/CustomGanttChart.tsx`
- Import and call `useProjectResources(projectId)` once at the top level
- Pass `resources` and `isLoadingResources` to `UnifiedScheduleTable`

#### 2. `src/components/schedule/UnifiedScheduleTable.tsx`
- Add `resources` and `isLoadingResources` props to the interface
- Pass them through to each `ResourcesSelector`

#### 3. `src/components/schedule/ResourcesSelector.tsx`
- Add optional `resources` and `isLoadingResources` props
- When provided, use them directly instead of calling `useProjectResources`
- Only fall back to the hook if no resources prop is passed (backward compat)

No changes needed to the filtering logic itself -- it already correctly matches project region to representative service areas. The data confirms: project "Outer Banks, NC" has matching reps (Chris Smith, Brian OConnor, Eddie Musick, Joey Austin).
