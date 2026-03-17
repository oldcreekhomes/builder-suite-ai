

## Fix: Files Not Showing Due to 1000-Row Supabase Limit

**Root cause**: This project has **1,644 files**, but the `useProjectFiles` hook makes a single Supabase query with no `.range()` call, so it silently caps at 1,000 rows. Your newly uploaded PDF (sorted alphabetically) falls beyond the 1,000th row and never gets fetched. The console logs confirm this: `count: 1000`.

**The fix already exists** — there's a `fetchAllRows` utility in `src/lib/supabasePaginate.ts` that paginates in batches of 1,000. It just needs to be wired into `useProjectFiles`.

### Changes

**File: `src/hooks/useProjectFiles.tsx`**

1. Import `fetchAllRows` from `@/lib/supabasePaginate`
2. Replace the single `supabase.from('project_files').select(...)` call with `fetchAllRows()`, passing a builder function:

```typescript
const filesData = await fetchAllRows(() =>
  supabase
    .from('project_files')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .order('filename', { ascending: true })
);
```

3. Remove the old `{ data: filesData, error }` destructuring and the manual error check (fetchAllRows throws on error).

This is a single-file, ~5-line change. No new dependencies needed — `fetchAllRows` is already in the project and handles the pagination loop automatically.

