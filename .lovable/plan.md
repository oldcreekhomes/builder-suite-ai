# Reset Accounting Reports Recipient to Matt Gray

One-time data update, no code changes. Applies to all 33 Old Creek Homes projects (owned by mgray@oldcreekhomes.com).

## What will change

For **every project owned by Matt Gray**:

1. **Clear all existing Accounting Reports recipients** — un-check every user's `receive_accounting` and `is_primary_accounting` flags.
2. **Set Matt Gray as the sole Accounting Reports recipient** — checked and starred as Primary.
3. Any rows that no longer have any notification flags set (all 5 receive_* fields false) will be cleaned up so the matrix stays tidy.

## What is NOT touched

- Bid, PO, Schedule, and Bid Submitted columns — untouched on every project.
- Any project not owned by Matt Gray.
- No code changes; edge functions, UI, and the matrix component all keep working as-is.

## Answering your question

Yes — the earlier backfill assumed `accounting_manager` should receive Accounting Reports (that's why Erica Gray showed up checked, since she's the accounting manager on North Potomac). That assumption is being reversed for Old Creek Homes with this one-time cleanup, and going forward you control it manually via the Notifications tab.
