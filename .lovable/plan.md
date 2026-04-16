
## Plan: Speed up Budget Details modal open

### Problem
Clicking a budget row takes 3-5 seconds before the modal becomes interactive. The modal mounts immediately but blocks on serial network requests before hydrating, making it feel frozen.

### Root cause (to confirm by reading code)
`BudgetDetailsModal.tsx` issues several queries on open and only finishes hydrating once they all resolve:
- `budget-siblings-manual` (sibling rows for same project + cost code)
- `budget-manual-lines` (sub-lines from `project_budget_manual_lines`)
- `manual_allocation_mode` reconciliation now also waits on siblings
- Plus PO list, vendor bid list, historical projects (per-tab data)

These run with default React Query settings (no `staleTime`, refetch on focus), so every open re-fetches from scratch even when the user just closed the same modal. The Manual tab hydration `useEffect` is gated on all of them resolving, which is what creates the visible "frozen" delay.

### Fix strategy

1. **Render instantly with optimistic state**
   - Open the modal and show the Manual tab immediately seeded from `budgetItem` itself (already in cache from the budget grid).
   - Show a subtle inline "syncing…" indicator only on the Allocation Mode panel while siblings/lines load — do NOT block the whole dialog.

2. **Cache aggressively**
   - Add `staleTime: 60_000`, `refetchOnWindowFocus: false`, `refetchOnReconnect: false`, and `placeholderData: keepPreviousData` to:
     - `budget-siblings-manual`
     - `budget-manual-lines`
     - PO list, vendor bid list, historical project list queries used by other tabs
   - Result: reopening the same (or nearby) cost code is instant.

3. **Prefetch on hover/row-mount**
   - In the budget table row component, prefetch `budget-siblings-manual` and `budget-manual-lines` for the row's cost code on `onMouseEnter` (and optionally on row mount for the visible viewport). By the time the user clicks, data is already warm.

4. **Lazy-load non-active tabs**
   - Only fetch PO / Vendor Bid / Historical data when those tabs are actually selected (`enabled: activeTab === 'purchase-orders'`, etc.). Today they likely fire on open.

5. **Tighten hydration gating**
   - Remove the "wait for siblings before seeding manualLines" gate. Seed from `budgetItem` first, then reconcile (scale factor / saved mode) when siblings arrive — using the existing `hydrationKey` mechanism so it re-runs cleanly.

6. **Memoize heavy derivations**
   - Wrap `siblingRows` reconstruction math and `manualInitialState` in `useMemo` keyed on stable inputs to avoid re-renders during typing.

### Files to change
- `src/components/budget/BudgetDetailsModal.tsx` — optimistic seed, lazy-tab `enabled` flags, staleTime on its internal queries, hydration gate fix.
- `src/components/budget/BudgetDetailsPurchaseOrderTab.tsx` — gate PO query on tab active.
- Vendor Bid / Historical tab components — same `enabled` gating + staleTime.
- Budget grid row component (the one that opens the modal) — add `onMouseEnter` prefetch via `queryClient.prefetchQuery` for the two manual-related keys.

### Out of scope
- No DB or schema changes.
- No change to allocation math, persistence, or saved-mode behavior from prior fix.
- No UI redesign of the modal.

### Validation
1. Click a budget row cold → modal is interactive in <300 ms; Allocation Mode shows a brief "syncing" hint then resolves.
2. Hover a row for ~200 ms then click → modal opens instantly with full data.
3. Reopen the same row within 60 s → instant, no spinner.
4. Saving still updates rows correctly and the modal reopens with the saved allocation mode (regression check on the previous fix).
5. Switching to PO / Vendor Bid / Historical tabs fetches their data only on first activation.
