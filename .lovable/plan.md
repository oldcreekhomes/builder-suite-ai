

## Filter Schedule Resources by Project Region

### Problem
The resource selector in the schedule shows ALL company representatives regardless of region. For example, a DC-only representative shows up on an Outer Banks project schedule, which is confusing and clutters the list.

### Solution
Filter the "Company Representatives" section of the resource dropdown so only representatives whose `service_areas` include the current project's region are shown. Internal users remain unfiltered (they work across all regions).

### Changes

#### 1. Update `useProjectResources` hook (`src/hooks/useProjectResources.ts`)
- Add an optional `projectId` parameter
- When `projectId` is provided, fetch the project's `region` from the `projects` table
- Include `service_areas` in the `company_representatives` query
- After fetching representatives, filter out any whose `service_areas` does not contain the project's region
- If the project has no region set, show all representatives (backward compatible)

#### 2. Update `ResourcesSelector` component (`src/components/schedule/ResourcesSelector.tsx`)
- Add an optional `projectId` prop
- Pass it through to `useProjectResources(projectId)`

#### 3. Update `UnifiedScheduleTable` component (`src/components/schedule/UnifiedScheduleTable.tsx`)
- Add a `projectId` prop to the component interface
- Pass it down to each `ResourcesSelector` instance

#### 4. Update `CustomGanttChart` component (`src/components/schedule/CustomGanttChart.tsx`)
- Pass the existing `projectId` prop to `UnifiedScheduleTable`

#### 5. Update `TaskRow` component (`src/components/schedule/TaskRow.tsx`) (if used)
- Add `projectId` prop and pass it to `ResourcesSelector`

### Filtering Logic
```text
IF project.region IS NOT NULL:
  Show rep only if rep.service_areas CONTAINS project.region
ELSE:
  Show all representatives (current behavior)
```

Internal users are always shown regardless of region.

