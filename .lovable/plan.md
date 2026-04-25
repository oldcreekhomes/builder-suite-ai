## Goal

When a user clicks **Send PO** on a bid (Bidding tab), parse the attached proposal PDF(s) with AI, infer line items + cost codes, and let the user **review/edit them in a confirmation step** before the PO is created and the email is sent. This eliminates the current behavior where every PO is lumped into a single line under the bid package's parent cost code.

## Where the change lives

**Touched files**
- `supabase/functions/extract-po-lines/index.ts` *(new edge function)* — Lovable AI Gateway call that reads the proposal PDF(s) and the tenant's cost codes, then returns structured line items.
- `supabase/functions/extract-po-lines/index.ts` registered in `supabase/config.toml` with `verify_jwt = true`.
- `src/components/bidding/ConfirmPODialog.tsx` — expand from a 4-field summary modal into a wider review dialog with an editable line-items table (matches the look of `CreatePurchaseOrderDialog` line items: Cost Code, Description, Qty, Unit Cost, Amount, Extra). Adds an "Extracting line items…" loading state on open.
- `src/hooks/usePOMutations.ts` — `createPOAndSendEmail` accepts an optional `lineItems` array and, after inserting the PO, writes them to `purchase_order_lines` (reusing the existing `usePurchaseOrderLines.saveLinesForPO` pattern).
- `src/hooks/useProposalExtraction.ts` *(new)* — small hook that POSTs the proposal storage paths + cost-code list to the new edge function and returns `{ lines, isLoading }`.

**Untouched (intentionally)**
- `EditBillDialog`, `BillsApprovalTable`, the bidding tabs UI, and all accounting/journal logic.
- The existing single-line PO fallback still works if AI extraction fails — the dialog will simply show one editable empty row and the user proceeds as today.

## Flow

1. User clicks **Send PO** on a bidding company row → `ConfirmPODialog` opens.
2. On open, if the bid has `proposals` files, the dialog calls `extract-po-lines` with:
   - `proposalPaths: string[]` (storage paths under `project-files/proposals/…`)
   - `costCodes: { id, code, name }[]` (parent codes for this tenant, fetched via existing `useCostCodeSearch`)
   - `bidPackageCostCodeId` (used as fallback / preferred match)
3. Edge function:
   - Downloads each proposal PDF via the service-role client.
   - Sends to **Lovable AI Gateway** (`google/gemini-3-flash-preview`) with a structured-output schema that returns `{ lines: [{ cost_code_id|null, cost_code_hint, description, quantity, unit_cost, amount, extra }] }`.
   - Resolves `cost_code_hint` (e.g. "Civil Engineering", "Entitlement", "Surveying") to the closest tenant cost code by name, falling back to the bid-package cost code if no confident match.
   - Returns the array. Handles 429 (rate limit) and 402 (credits exhausted) with friendly toast messages on the client.
4. Dialog renders the editable table. Cost Code uses the same searchable picker as `CreatePurchaseOrderDialog`. Subtotal updates live.
5. On **Send PO**, `createPOSendEmailAndUpdateStatus` is called with the edited `lineItems`. After the PO row is inserted, lines are written via `purchase_order_lines` and `total_amount` is recomputed from the line subtotal (so it stays in sync with what the user just confirmed).
6. The PO email payload is unchanged in shape — `total_amount` reflects the new subtotal.

## Data + cost-code resolution

- Cost-code matching uses three passes: exact name match → case-insensitive contains → fallback to the bid package's cost code. The AI is instructed to prefer the supplied list verbatim.
- All amounts go through the existing cent-precise rounding helper to honor the `Cent Math` core memory rule.
- Extraction is **per-tenant scoped** — the edge function uses `getEffectiveOwnerId` semantics (passed from client) to filter cost codes, matching the `Multi-tenant Data Isolation` core rule.

## Edge cases

- **No proposal attached** → skip extraction, show a single empty row (today's behavior).
- **Hourly / "as required" line items** (e.g. items 6, 11, 12 in the sample) → extracted with `unit_cost = 0`, `quantity = 0`, `extra = true`, and a description like "Project Management — Hourly". The user can keep, edit, or delete these before sending.
- **Multi-rate items** (e.g. construction-survey sub-items) → extracted as separate lines with their lump-sum prices.
- **AI failure / timeout** → toast "Couldn't auto-extract line items — enter them manually" and fall back to a single empty line. The Send PO flow is never blocked.

## Out of scope (will not touch in this change)

- Re-extracting after the PO has already been sent (the "Resend PO" mode keeps current behavior).
- Editing line items from the Bidding tab outside of the Send PO confirmation step.
- Any bill / approval / journal-entry code paths.

Ready to implement on approval.