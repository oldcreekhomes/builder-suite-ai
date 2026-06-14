Fix the resource search filter in `src/components/schedule/ResourcesSelector.tsx` so it matches any word in the resource name (and company name), not just the first word.

## Change

In the `Command` `filter` function, replace the `startsWith` checks with substring matching across all name tokens:

- Match if the search term is a substring of the full resource name (e.g. "irw" → "Dick Irwin").
- Match if the search term is the prefix of any whitespace-separated token in the resource name (covers last names, middle names).
- Keep existing company-name matching, but also allow substring match so "tnt" finds "TNT Services Group" anywhere.

Effectively: lowercase the term, then return 1 if `resourceName.includes(term)` OR any token in `resourceName.split(/\s+/)` starts with `term` OR `companyName.includes(term)`.

No other files change. No behavior change to the selected-list pinning (`selected-` prefix still returns 1).
