# Project Manager dashboard — shared Cash Position

## Requested result

Keep the Accountant dashboard exactly as it is. Reuse its existing Cash Position table on the Project Manager dashboard, showing only projects where the signed-in user is the Accounting Manager.

## Layout

On desktop:

```text
| My Projects       | Project Bids       | Insurance Alerts   |
| Accounting Alerts (half width) | Cash Position (half width) |
| Weather Forecast — unchanged, at the bottom               |
```

- Make the three top panels equal in size; My Projects no longer spans both rows. Keep its list scrollable.
- Move the existing Accounting Alerts panel below My Projects and Project Bids, occupying the left half.
- Place Cash Position directly beside it, occupying the right half.
- Remove Recent Photos from this dashboard, including its import and mounted photo/count requests. Do not delete photos or remove photo viewing elsewhere.
- Stack panels on narrower screens; keep the full Cash Position table readable with contained horizontal scrolling rather than squeezing or dropping fields.

## Shared behavior

- Use one `CashPositionCard` implementation for both locations—no copied table or calculation logic.
- Accountant mode keeps all its current rows, fields, search, 10/15/20-day selector, refresh, totals and appearance.
- Project Manager mode matches `projects.accounting_manager` to the current user's ID. Construction Manager assignment alone does not qualify, and unassigned projects do not appear.
- Apply the manager filter before search and totals. Erica sees only Erica's Accounting Manager projects; another user sees only their own. No matching projects shows an empty state, never all projects.
- Retain the same bank balances, approved-bill calculations, cent precision and positive/negative colors.
- Allow the shared header to wrap within the half-width panel without changing its Accountant presentation.

## Technical details

- Update the Project Manager branch of `src/pages/Index.tsx`; leave Owner and Accountant layouts unchanged.
- Add an explicit scope option to `CashPositionCard`, defaulting to its existing Accountant behavior. Use `useAuth` and the existing `accounting_manager` field from `useProjects` for Project Manager filtering.
- Include user identity and scope in the Cash Position query cache key, and wait for a user before fetching, to avoid reusing another user's cached results.
- Continue using the existing tenant-scoped `get_project_cash_position` RPC without changing its accounting logic or database permissions. This is dashboard filtering, not a new restriction on users who already have Accountant dashboard access.
- Record the shared-component decision in `AGENTS.md` during implementation.

## Verification

- Add and run focused tests: Erica's scope excludes another manager's projects; construction-manager-only and unassigned projects are excluded; no user yields no rows; Accountant scope preserves all supplied rows; scoped totals include only matched projects.
- Check the preview's build diagnostics after changes.
- Check desktop and narrow-screen layout, table/header overflow, internal scrolling and Weather Forecast placement.
- Verify that Recent Photos no longer mounts or requests photos on the Project Manager dashboard.
- Verify both dashboard modes with signed-in sessions if available; otherwise report authenticated verification as unavailable rather than claiming it passed.