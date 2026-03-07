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
