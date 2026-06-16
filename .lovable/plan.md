## Problem

When viewing Erica Gray's Project Manager dashboard, the **Accounting Alerts** card is empty even though she is the `accounting_manager` on 4 active projects (2 of them with pending draft bills).

## Root cause

`src/hooks/useAccountingManagerBills.ts` resolves the current user with:

```ts
const { data: { user } } = await supabase.auth.getUser();
...
.eq('accounting_manager', user.id)
```

`supabase.auth.getUser()` always returns the **real** Supabase auth user — it has no awareness of Lovable's impersonation layer. So whenever the owner is impersonating Erica (which is how "her" PM page is being viewed), the query filters by the owner's id, not Erica's, and returns zero projects → the Accounting Alerts card renders empty.

Every other hook in the project that needs the "current effective user" reads from `useAuth()`, which already merges in `impersonatedProfile.id` when `isImpersonating` is true.

## Fix (single, minimal change)

Update `src/hooks/useAccountingManagerBills.ts`:

1. Import `useAuth` from `@/hooks/useAuth`.
2. Read `const { user } = useAuth();` at the top of the hook.
3. Drop the in-`queryFn` call to `supabase.auth.getUser()`.
4. Pass the resolved `user.id` into the query, and include it in the `queryKey` so impersonation switches correctly bust the cache:
   ```ts
   queryKey: ['accounting-manager-bills', user?.id],
   enabled: !!user?.id,
   ```
5. Use `user.id` in `.eq('accounting_manager', user.id)`.

No other files change. No UI, layout, filter, or address-formatting changes. No DB or RLS changes (RLS already permits Erica to read her company's projects via `home_builder_id`).

## Verification

After the change, with the owner impersonating Erica:
- The `projects` query in the hook returns Erica's 4 active accounting-manager projects.
- `ProjectWarnings` renders rows for those projects, including the 2 with draft-bill counts (17 and 5).
- Switching impersonation off (or to another employee) refetches because `user.id` is part of the query key.
