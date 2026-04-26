# Project-Scoped PO Matching — Use the Context We Already Have

## You were right to push back

My previous plan suggested fetching POs across **all projects** for a vendor. That's wrong. The user uploads bills from inside a project page, and the `project_id` is already saved on `pending_bill_uploads` at upload time. The address on the invoice ("214 N. Granada") confirms the project. There is exactly one RC Fields PO on this project. The match is unambiguous and should be automatic.

## Root cause (verified)

- `SimplifiedAIBillExtraction.tsx` line 240 already writes `project_id` to the `pending_bill_uploads` row.
- `SimplifiedAIBillExtraction.tsx` line 690 calls `extract-bill-data` but **does not pass `pendingUploadId`'s project context to the AI** — the function never loads the project's POs.
- Result: AI extracts cost codes blindly, then `rematch-pending-bill` only runs PO-snap on user action — never automatically right after extraction.

## Fix — three small, scoped changes

### 1. `extract-bill-data/index.ts` — load this project's vendor POs and use them as the source of truth

When the function starts, it already loads the `pending_bill_uploads` row (it has the `project_id`). Add:

- After vendor matching succeeds, if `project_id` is set on the upload, query:
  ```
  project_purchase_orders + purchase_order_lines
  WHERE project_id = <upload.project_id> AND company_id = <matched vendor_id>
  ```
- Build a "PO context" object containing each PO's lines with their cost code (parent code), description, quantity, and unit cost.
- Inject this into the AI prompt as a **constraint section**:
  > **PURCHASE ORDER CONTEXT FOR THIS BILL**
  > This vendor has the following PO line(s) on this project. Match each invoice line to the closest PO line by description and amount. Use the PO line's cost code — do not invent a different one.
  > [list of PO lines with code, description, qty, unit cost]
- If the vendor has **exactly one PO with one cost code** on this project → instruct the AI to use that code for every line and skip the cost-code-list section entirely.

This gives the AI direct visibility into the answer instead of guessing from the global cost code list.

### 2. `extract-bill-data/index.ts` — write `purchase_order_id` onto each pending bill line

When the AI returns line items, after the existing parent-code rollup logic, run a final pass:
- For each pending line, find the best PO line match (by cost code + description similarity) within the project-scoped PO set.
- Write `purchase_order_id` and `purchase_order_line_id` onto the `pending_bill_lines` row so `usePendingBillPOStatus` immediately resolves to "Matched" without any user interaction.

### 3. `SimplifiedAIBillExtraction.tsx` — pass project context in the invoke body (defense in depth)

Even though the function can read it from the upload row, also pass `projectId` directly in the `supabase.functions.invoke('extract-bill-data', { body })` call (line 690-696). This avoids a round-trip and makes the contract explicit.

## What this does NOT change

- No cross-project search. Ever. PO lookup is strictly `WHERE project_id = upload.project_id`.
- No changes to `rematch-pending-bill` — the existing PO-snap logic stays as a safety net for when the user later changes the project.
- No schema changes.
- Parent-only cost code rule from the previous plan stays in place.

## Files modified

- `supabase/functions/extract-bill-data/index.ts` — add project-scoped PO loading, inject PO context into prompt, write `purchase_order_id` onto pending lines.
- `src/components/bills/SimplifiedAIBillExtraction.tsx` — pass `projectId` explicitly in the invoke body.

## Expected outcome on the RC Fields bill

- Upload happens on the 214 N. Granada project page → `project_id` is set.
- Extraction loads the one RC Fields PO for this project, sees its lines (`2030 Entitlement Engineering`, `2050 Civil Engineering`, etc.).
- AI matches "Expanded Housing Option" → 2030 PO line, "Stormwater and Environmental Management" → 2050 PO line — using the PO's exact wording as a guide.
- `purchase_order_id` is stamped on each line during extraction.
- The bill row in the review table shows "Matched" immediately, no user action required.
