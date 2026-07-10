Fix the PO cancellation path in two places:

1. **Fix the email function runtime/import failure**
   - Update `send-po-email` so Resend is imported in a Deno-compatible way instead of the current `esm.sh/resend@4.0.0` path that is producing `node:zlib` / module resolution errors in edge logs.

2. **Stop cancellation emails from doing bid/proposal lookup work**
   - For `isCancellation: true`, skip the bid package/proposal PDF lookup and PDF stamping logic entirely. A cancellation email does not need to refetch the original bid PDFs, and that lookup is where the `PGRST116` 0-rows bid package error is appearing.

3. **Make delete/cancel unblockable by email side effects**
   - In `usePurchaseOrderMutations.ts`, delete the PO first.
   - After the delete succeeds, try sending the cancellation email best-effort.
   - If the email fails, show a warning that the PO was deleted but the email failed, instead of failing the delete.

4. **Verify**
   - Confirm the code compiles.
   - Check recent `send-po-email` logs after deploy/call if available to ensure the module error and cancellation lookup error are gone.