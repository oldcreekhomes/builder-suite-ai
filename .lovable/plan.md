## Fix 1 — One toast per batch save

`useDeposits.createDeposit` fires a "Deposit recorded successfully" toast on every insert, so a 6‑row batch = 6 toasts (they queue because `TOAST_LIMIT = 1`).

- Add an optional `silent?: boolean` on `createDeposit.mutateAsync` variables.
- In its `onSuccess`, skip the toast when `variables.silent === true` (keep cache invalidation + error toast as-is).
- In `useMultiDepositBatchSave`, pass `silent: true` on every row call.
- In `MultiDepositTable.handleSave`, keep exactly one toast on completion: `"Saved N deposits"` (and one error toast on failure).

## Fix 2 — "Multiple Deposits Batches" shows nothing

Network shows the list query is 400ing:

```
Could not find a relationship between 'deposits' and 'project_id'
```

`deposits` has no FKs to `projects`, `accounts`, or `companies`, so PostgREST refuses the nested `projects:project_id(address)`, `accounts:bank_account_id(...)`, `companies:company_id(...)` embeds. The whole request fails → empty batch list.

- Rewrite `useMultiDepositBatches` to fetch `deposits` with plain columns only (no nested embeds).
- After the deposit fetch, do three batched lookups via `batchedIn`:
  - `projects` by id → `address`
  - `accounts` by id → `code`, `name` (for bank label)
  - `companies` by id → `company_name`
- Merge those maps into each `MultiDepositBatchDeposit` exactly like before, so `MultiDepositBatchHistory` renders unchanged.

Everything else in the batch history UI stays the same.