
## Goal

Give the Transaction Details "Edit Description" dialog a history log (like Bill Notes), so each edit is attributed (user + date) and prior values remain visible below Cancel / Save.

## Behavior

1. **Storage format** — keep using the same memo field already used today (`bill_payments.memo`, `bill_lines[0].memo`, `check_lines[0].memo`, etc.). Store entries in the existing Bill Notes format:
   ```
   UserName | MM/DD/YYYY: latest description

   UserName | MM/DD/YYYY: previous description

   …legacy text…
   ```
   New entries are **prepended** (newest first) using the existing `appendBillNote` helper.

2. **Current description display** — In `TransactionDetailDialog`, parse the memo via `parseBillNotes`. If entries exist, show the first entry's `content` as the Description value. Otherwise show the raw text (handles fully-legacy descriptions transparently).

3. **Edit Description dialog (`EditDescriptionDialog.tsx`)** — Restructure to mirror `BillNotesDialog`:
   - Top: textarea labeled "New description" (empty on open; placeholder "Enter description…").
   - Footer: Cancel / Save (Save disabled when textarea is empty/whitespace, matching Bill Notes).
   - Below footer: "Previous descriptions" section — a `ScrollArea` listing parsed entries from the current memo (same card style as Bill Notes: user icon + name, calendar icon + date, content). Legacy entries (no date) show "(no date)" italic.
   - On Save: fetch the current user's display name (same source as Bill Notes — `profiles.full_name` for `auth.uid()`, fallback to email/local-part), call `formatBillNote(userName, newText)`, prepend onto the existing memo with `appendBillNote`, and write the combined string to the same target field already handled in `handleSave` (consolidated → `bill_payments.memo`; bill_payment → first `bill_lines.memo`; default → first lines table memo). Keep `journal_entry_lines.memo` sync, but write only the **latest entry's content** there (not the full history) so the GL register stays clean. Same invalidations as today.

4. **Seeding "original bill" entry** — no migration. The existing memo text is preserved and rendered as a legacy entry. For Bill Payment rows where no entries exist yet, the underlying bill description (`bill_lines.memo` from the original bill, already fetched by the dialog) is shown as a one-off legacy "Original" entry in the history list (read-only, sourced from the bill, not from this memo). It is not written into the payment's memo on save — only new user entries are.

## Technical details

Files:
- `src/components/accounting/EditDescriptionDialog.tsx` — add history UI, fetch existing memo + user name, prepend new entry via `appendBillNote`/`formatBillNote`. Accept new optional prop `originalBillDescription?: string | null` rendered as a seeded legacy entry at the bottom of the history list when provided.
- `src/components/accounting/TransactionDetailDialog.tsx` — when rendering the Description row, run `parseBillNotes(value)` and show the first parsed entry's content (fallback to raw). Pass `originalBillDescription` through to `EditDescriptionDialog` for bill payments.
- `src/components/accounting/AccountDetailDialog.tsx` (only the prop wiring if it constructs `EditDescriptionDialog`) — pass through `originalBillDescription` when available.

No DB schema changes. No new tables. Backward-compatible with all existing memos.

## Out of scope

- Editing or deleting individual history entries.
- Backfilling existing memos into structured entries.
- Changes to Bill Notes dialog itself.
