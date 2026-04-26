# Smarter "Enter with AI" — Parent-Only Cost Codes + Auto-PO Snap

Two related fixes to bill extraction so the AI mirrors how POs are actually written.

## Problem

On the RC Fields invoice for 214 N Granada:
1. **Subcategories used instead of parents.** AI picked `2030.1 - EHO PLat` and `2050.3 - Stormwater and Environmental` (children). The PO uses parent codes only: `2030 - Entitlement Engineering` and `2050 - Civil Engineering`.
2. **Wrong PO logically possible.** RC Fields has only ONE PO on this project, so any extracted line for this vendor+project must roll up to that PO's cost codes — never a child code that doesn't exist on the PO.

## Root Cause

- `supabase/functions/extract-bill-data/index.ts` sends the AI **all** cost codes (parents + subcategories like `2030.1`, `2050.3`) and lets it pick any of them.
- Extraction runs **before** project selection, so the AI has no visibility into which POs exist on the project for this vendor — it can't constrain itself to the PO's cost code set.
- `rematch-pending-bill` already force-assigns the cost code when a vendor has only ONE company-cost-code link, but does nothing for project/PO context.

## Fix

### 1. Parent-only cost codes in extraction prompt (`extract-bill-data/index.ts`)

- When fetching `cost_codes` (line ~467), filter out subcategories: only include rows where `parent_group IS NULL` **AND** `code` does not contain a `.`.
- Apply the same filter to the per-company cost code list (lines 615-627) — strip any company-attached subcategories from what the AI sees.
- Add an explicit prompt rule under "SMART COST CODE ASSIGNMENT RULES":
  > **PARENT CODES ONLY:** Never return a subcategory cost code (codes containing a "." like "2030.1" or "2050.3"). Always roll up to the parent code (e.g. use "2030: Entitlement Engineering" instead of "2030.1: EHO PLat", and "2050: Civil Engineering" instead of "2050.3: Stormwater and Environmental").
- Also strip subcategories from the `learningExamples` / vendor pattern summary (lines 491-566) so historical bad picks don't re-train it. If `cost_code_name` starts with a code containing `.`, replace it with the parent code's display before showing as an example.

### 2. Auto-snap to vendor's PO cost codes once project is set

When the user picks the project during review, the existing `rematch-pending-bill` flow should be extended (or a sibling reconcile step added) to:

- Look up `project_purchase_orders` for `(project_id, vendor_id)` with their `purchase_order_lines` and cost codes.
- Build the set of cost codes present on those PO(s).
- For each `pending_bill_lines` row:
  - If the current `cost_code_id` is **not** in the PO cost-code set, but its **parent code** IS → swap to the parent (the most common case here: `2030.1` → `2030`, `2050.3` → `2050`).
  - If the vendor has exactly **one PO** on the project and that PO has exactly **one cost code** → force every line to that cost code (mirrors the existing single-vendor-cost-code logic).
  - If the vendor has **one PO** with multiple cost codes → keep the AI's choice only if it (or its parent) matches one of the PO's codes; otherwise leave as-is for manual review.
- This snap runs server-side in `rematch-pending-bill` (extend it to accept an optional `projectId`) and is invoked from the review UI whenever `project_id` changes on a pending bill.

### 3. Where to invoke from the UI

`BillsReviewTable` / row-level project selector already updates `pending_bill_uploads.project_id`. After that update succeeds, call the extended `rematch-pending-bill` with the new `projectId` so cost codes snap immediately and the existing `usePendingBillPOStatus` fallback can resolve the row to "Matched".

## Out of scope

- No changes to the PO entry/edit flow.
- No schema changes — `parent_group` and code-format conventions already encode parent vs child.
- Not touching `usePendingBillPOStatus` matching logic; once cost codes are corrected to parents, its existing vendor+project+cost_code fallback will resolve the match correctly.

## Files to modify

- `supabase/functions/extract-bill-data/index.ts` — parent-only filter + prompt rule + sanitize learning examples.
- `supabase/functions/rematch-pending-bill/index.ts` — accept optional `projectId`, add PO-aware cost-code reconciliation step.
- `src/components/bills/BillsReviewTable.tsx` (and/or the row-level project picker it uses) — invoke `rematch-pending-bill` with `projectId` after project change.
