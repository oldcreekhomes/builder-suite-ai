## Problem

Searching `AT` in the Resources picker still returns items like `Jamie Hill · Fairfax Water`, `Maria Guerrero · Elite Foam Insul…`, `Brett Carney · RC Fields`, `Dan Taylor · Creative Landscapes`, etc. None of these companies start with `AT`. The current substring filter matches `at` anywhere in the combined `"resourceName companyName"` string — so `Taylor`, `Water`, `Matlantic`, `Creative`, etc. all leak through.

## Fix

Change matching to **case-insensitive prefix match against the company name only** (and fall back to the rep name when there is no company, e.g. internal users without a company).

In `src/components/schedule/ResourcesSelector.tsx`:

1. Encode each `CommandItem`'s `value` so the filter can isolate the company name. Use a delimiter that won't collide:
   - External rep: `value={`${resource.companyName}||${resource.resourceName}||${resource.resourceId}`}`
   - Internal user: `value={`${resource.companyName ?? resource.resourceName}||${resource.resourceName}||${resource.resourceId}`}`
   - Selected group: keep the `selected-` prefix so they stay pinned.

2. Replace the `Command` filter with prefix logic:

```tsx
filter={(value, search) => {
  if (!search) return 1;
  if (value.startsWith('selected-')) return 1;
  const companyOrName = value.split('||')[0] ?? '';
  return companyOrName.toLowerCase().startsWith(search.toLowerCase().trim()) ? 1 : 0;
}}
```

## Result for `AT`

- Shows only companies whose name starts with `AT` (e.g. `AT&T`, `Atlantic …`, `Atrium …`).
- Hides `Fairfax Water`, `Elite Foam`, `RC Fields`, `Creative Landscapes`, `Midatlantic Party Wall`, internal users named `Matt`, etc.
- Selected items stay visible while editing.

## Out of scope

- No changes to data, grouping, ordering, or the notification-preference filter.
- Rep-name search is intentionally dropped per your instruction ("only return companies with names that start with…"). If you also want rep-name prefix matching (e.g. typing `Jam` to find `Jamie Hill`), say so and I'll add it as a second OR clause.
