

## Update Bill 14601 Cost Code from 1020: Deposits → 4040: Office Supplies

### What needs updating

Three records need direct data updates (no schema changes, no reversal):

**1. `bill_lines`** — line `a4f7a8ba-3c74-496b-ad59-be9139b64b06`
- Set `cost_code_id` to `846f4d07-3d11-487e-a030-8df25bc8f747` (4040: Office Supplies)
- Clear `account_id` to NULL (consistent with how other cost-code-based bill lines work)

**2. `journal_entry_lines`** — debit line `e8cc9132-4bd8-4eff-a58a-e3ff368bdf96`
- Change `account_id` from `6959b39e` (1020: Deposits) to `c9a35605` (1430: WIP - Direct Construction Costs) — this is the standard debit account used for cost-code-based bill lines
- Set `cost_code_id` to `846f4d07` (4040: Office Supplies)

**3. No changes to the A/P credit line** — it stays on the A/P account as-is.

### What stays the same
- No reversal entries created
- Bill amount ($316.57) unchanged
- A/P credit journal entry line unchanged
- Reconciliation status unchanged

### Technical note
These are data updates (UPDATE statements) executed via the insert/update tool, not schema migrations.

