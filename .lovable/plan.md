## Plan

Make the bill editor used in Review, Rejected, Approved, and Paid match the Enter with AI editor as the single visual/template standard.

### What will change
1. **Use the Enter with AI editor everywhere appropriate**
   - Repoint the Review tab (`draft`) and Rejected tab (`void`) away from the legacy `EditBillDialog` and into the same editor pattern used by Enter with AI (`EditExtractedBillDialog`).
   - Keep the dialog title generic as **Edit Bill**.

2. **Make Approved and Paid match the same layout and line-item experience**
   - Refactor the posted-bill editor so it renders the same structure as the Enter with AI editor:
     - same header fields/order
     - same line-item table layout
     - same multi-line breakout behavior
     - same description sourcing (`description || memo` where applicable)
     - same spinner suppression and table density
   - Preserve posted-bill guardrails from the existing approved/paid flow:
     - journal entry / bill update pathway for posted bills
     - restrictions on fields that cannot be changed after approval/payment
     - duplicate invoice validation and existing accounting protections

3. **Standardize all edit entry points**
   - Update every place that opens a bill editor so the user sees the same UI pattern:
     - `BatchBillReviewTable.tsx`
     - `BillsApprovalTable.tsx`
     - `PayBillsTable.tsx`
     - plus existing report/detail dialogs that still open posted-bill editing (`AccountDetailDialog.tsx`, `JobCostActualDialog.tsx`)
   - Result: Enter with AI, Review, Rejected, Approved, and Paid all open the same-looking editor experience.

4. **Fix the current build blockers before shipping**
   - Correct the Supabase edge-function type errors caused by relationship fields being treated as single objects when generated types currently expose arrays:
     - `supabase/functions/rematch-pending-bill/index.ts`
     - `supabase/functions/send-bid-reminders/index.ts`
     - `supabase/functions/reverse-duplicate-bills/index.ts`
   - Fix the Resend import mismatch by aligning `send-accounting-reports` with the project’s working Deno import pattern (`https://esm.sh/resend@4.0.0`) instead of `npm:resend@4.0.0`.

### Implementation approach
- Treat **Enter with AI** as the source-of-truth UI.
- Use that component’s line rendering and grouped breakout behavior as the visual/template base.
- For posted bills, adapt data loading/saving to `bills`/`bill_lines` while preserving the Enter with AI presentation.
- Avoid a risky table-schema merge between pending and posted data models; unify the experience at the component/UI layer and routing layer first.

### Technical details
- Current divergence:
  - Enter with AI and batch upload use `EditExtractedBillDialog.tsx` over `pending_bill_uploads` / `pending_bill_lines`.
  - Review/Rejected/Approved/Paid currently open the legacy `EditBillDialog.tsx` over `bills` / `bill_lines`.
- The legacy dialog already contains the posted-bill mutation path (`updateApprovedBill`) that must be retained.
- The Enter with AI dialog already contains the line grouping and richer breakout display the user wants restored.
- Build issues observed are separate from the editor request, but they must be fixed in the same implementation pass or the project will not typecheck cleanly.

### Expected result
- One consistent **Edit Bill** experience across Enter with AI, Review, Rejected, Approved, and Paid.
- Multi-line invoices stay visibly broken out instead of collapsing into a simpler legacy layout.
- Approved/Paid still obey accounting safety rules.
- Build/typecheck errors are cleared so the changes can ship cleanly.