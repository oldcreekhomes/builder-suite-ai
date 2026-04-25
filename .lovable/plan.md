# Refine Confirm PO Dialog

Three coordinated changes to the "Send PO" → Confirm PO experience.

## 1. Defer the dialog until extraction completes
- When the user clicks **Send PO**, do NOT open the dialog immediately.
- Instead, show an inline status next to the row's action with the existing **Sparkles** icon and the text **"Creating PO with AI…"** (same icon as today's "Auto-extracted" hint, just different words; no extra spinner).
- Run `extract-po-lines` in the background. When it returns (or errors), open `ConfirmPODialog` with the pre-extracted `lineItems` already populated.
- Remove the in-dialog "Extracting line items from proposal…" spinner row and the "Auto-extracted — review and edit before sending" hint, since extraction is already done by the time the dialog appears.

**Implementation:**
- Add `initialLineItems?: LineItemInput[]` prop to `ConfirmPODialog`. When present, seed state from it and skip the internal extraction `useEffect`.
- In `BiddingTableRow.tsx` and `components/BiddingCompanyRow.tsx`, the Send PO handler:
  1. Sets `creatingPO = true`.
  2. Calls `supabase.functions.invoke('extract-po-lines', …)` with the bid package's single cost code (see §2).
  3. On settle, stores the lines, sets `creatingPO = false`, opens the dialog with `initialLineItems` passed in.
- While `creatingPO` is true, render the Sparkles icon + "Creating PO with AI…" inline beside the action and disable re-clicks.

## 2. Lock extraction to the bid package's cost code
The bid package is created against ONE cost code (e.g. `2065 Architectural`). The vendor was invited specifically for that scope, so all PO lines must roll up to that single cost code — no AI guessing across the full chart of accounts.

**Edge function (`supabase/functions/extract-po-lines/index.ts`):**
- Accept a new field `lockedCostCodeId` in the request body.
- When present, pass ONLY that cost code to the AI and rewrite the prompt: *"All line items belong to this single cost code: `{code} - {name}`. Extract one line per discrete priced task; do not split across multiple cost codes."*
- In post-processing, force every returned line's `cost_code_id` / `cost_code_display` to the locked cost code regardless of what the model returned.
- Keep the existing fallback path for any callers that don't supply a locked cost code.

**Client:**
- Pre-extraction call passes `lockedCostCodeId: costCodeId` (the bid package's cost code).
- Result: every line opens with `2065 - Architectural` already filled in; user only edits descriptions / amounts.

## 3. Consolidate the dialog layout (`ConfirmPODialog.tsx`)

**Line Items table — add a new Proposal column between Unit Cost and Amount, shrink Qty:**

| Column       | Old   | New      |
|--------------|-------|----------|
| Cost Code    | 200px | 200px    |
| Description  | flex  | flex     |
| Qty          | 80px  | **40px** |
| Unit Cost    | 110px | 110px    |
| **Proposal** | —     | **70px** *(new)* |
| Amount       | 110px | 110px    |
| Extra        | 60px  | 60px     |
| (delete)     | 50px  | 50px     |

- The new **Proposal** cell (shown on row 0 only to avoid clutter) renders the file icon via `getFileIcon` / `getFileIconColor`, clickable to preview through `openFile` (same handler as today), with the existing small ✕ delete affordance.
- Remove the standalone **Attached Proposals** section at the bottom of the dialog — its functionality moves into the table.

**Custom Message + Add Line on the same row:**
- Wrap them in `flex gap-3 items-start`:
  - Left (`flex-1`): Custom Message label + `Textarea` (reduce `rows={3}` → `rows={2}`).
  - Right (`shrink-0 self-end`): the `+ Add Line` button aligned to the bottom edge of the textarea.

**Net effect:** dialog drops the standalone proposals strip and the standalone Add Line button row; Qty narrows to make room for the inline proposal icon. Overall vertical height shrinks noticeably.

## Files modified
- `supabase/functions/extract-po-lines/index.ts` — accept `lockedCostCodeId`, restrict prompt + force mapping.
- `src/components/bidding/ConfirmPODialog.tsx` — add `initialLineItems` prop, drop in-dialog extraction UI, restructure table (new Proposal column, narrower Qty), merge Custom Message + Add Line row, remove standalone Attached Proposals block.
- `src/components/bidding/BiddingTableRow.tsx` — pre-extract before opening dialog; show "Creating PO with AI…" inline status.
- `src/components/bidding/components/BiddingCompanyRow.tsx` — same pre-extract flow.

## Out of scope
- No DB schema changes.
- No changes to PO persistence, email sending, or post-send behavior.
- "Resend" mode path is unchanged.