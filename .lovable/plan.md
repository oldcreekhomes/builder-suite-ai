## Fix PO PDF duplication when creating PO from bid

**Root cause:** In `src/hooks/usePOMutations.ts` `createPOAndSendEmail`, the proposal files from `biddingCompany.proposals` are added to `purchaseOrderData.files`, then the caller's `files` (which already include those same proposals — seeded by `CreatePurchaseOrderDialog` from `biddingCompany.proposals`) are appended on top. Result: each proposal PDF is stored twice on the PO.

### Changes

**`src/hooks/usePOMutations.ts` — `createPOAndSendEmail` only**

1. Treat caller-provided `files` as authoritative:
   - If `files` is provided (even empty array), use it as the source of truth — do NOT also auto-append `biddingCompany.proposals`.
   - Only auto-attach `biddingCompany.proposals` when `files` is `undefined` (legacy callers that don't pass files at all).
2. Add a final dedupe pass on `purchaseOrderData.files` keyed by `id`, falling back to `url`, then `name`. This protects against any legacy double-passes.

No changes to:
- `CreatePurchaseOrderDialog.tsx` (its seeding behavior is correct)
- `resendPOEmail` (doesn't touch files)
- `createPOSendEmailAndUpdateStatus` (just calls into `createPOAndSendEmail`)
- DB schema, RLS, edge functions, or existing PO records

### Scope
One file, ~15 lines changed. No UI changes.
