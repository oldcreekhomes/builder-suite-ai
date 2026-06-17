# Clear managers on Permanently Closed projects

Run a one-time data update against `public.projects`:

```sql
UPDATE public.projects
SET accounting_manager = NULL,
    construction_manager = NULL
WHERE status = 'Permanently Closed';
```

Affects 1 row today (7313 Woodley Place, Falls Church, VA 22046 — clears its Accounting Manager). All other Permanently Closed projects already have both fields empty, so they're unchanged.

No schema, code, or RLS changes. Future Permanently Closed projects would need to be re-cleared the same way unless you'd also like an auto-clear rule when a project's status is set to Permanently Closed — say the word and I'll add a trigger.
