const PAGE_SIZE = 1000;

/**
 * Fetches all rows from a Supabase query by paginating in batches of 1000.
 * Supabase has a default 1000-row limit; this helper loops with .range()
 * until all rows are retrieved.
 *
 * @param buildQuery - A function that returns a fresh Supabase query builder
 *                     (must be callable multiple times since .range() mutates the builder).
 * @returns All rows concatenated.
 */
/**
 * Batches a Supabase `.in()` filter into chunks to avoid URL length overflow.
 * When passing hundreds of UUIDs into `.in()`, the GET URL can exceed the ~8KB
 * limit, causing a 400 Bad Request. This splits the IDs into smaller batches.
 */
export async function batchedIn<T = any>(
  buildQuery: (ids: string[]) => any,
  allIds: string[],
  batchSize = 200
): Promise<T[]> {
  if (allIds.length === 0) return [];
  const results: T[] = [];
  for (let i = 0; i < allIds.length; i += batchSize) {
    const chunk = allIds.slice(i, i + batchSize);
    const { data, error } = await buildQuery(chunk);
    if (error) throw error;
    if (data) results.push(...data);
  }
  return results;
}

export async function fetchAllRows<T = any>(
  buildQuery: () => any
): Promise<T[]> {
  const allData: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await buildQuery().range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    if (data) {
      allData.push(...data);
    }

    // If we got fewer than PAGE_SIZE rows, we've reached the end
    if (!data || data.length < PAGE_SIZE) break;

    from += PAGE_SIZE;
  }

  return allData;
}
