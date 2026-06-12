## Fix Write Checks so the Bank Account always saves

When you change the Bank Account on an existing check and click Save & New or Save & Close, the new bank account isn't being persisted. This plan fixes that — no data will be moved or changed by me.

### What I will change

1. **`src/hooks/useChecks.ts`** — Allow `bank_account_id` in the check update payload so the selected bank account is actually written to the `checks` row. Rebuild the linked journal entry's bank credit line to match the new bank account, so the bank register and reports follow the check.

2. **`src/components/transactions/WriteChecksContent.tsx`** — Resolve the bank account from the visible "Bank Account" field at the moment of save (so what you see is what gets saved), and include it in the update for all three buttons: Save Entry, Save & New, and Save & Close.

3. **`src/pages/WriteChecks.tsx`** — Include the resolved `bank_account_id` in the update payload for Save & New and Save & Close on the standalone Write Checks page.

### What I will NOT do

- I will not move, edit, or correct any existing checks or journal entries in your data.
- No SQL migration. The OCH check at 126 Longview Drive stays exactly as it is — you'll fix it yourself once saving works.

### How you'll verify

Open the OCH check, change Bank Account to `1015 - Capital One`, click Save & Close, reopen it — Bank Account should now show Capital One, and the bank register should reflect the change.
