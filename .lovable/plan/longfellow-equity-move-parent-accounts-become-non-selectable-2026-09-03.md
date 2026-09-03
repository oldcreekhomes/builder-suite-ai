# Longfellow equity move + parent accounts become non-selectable

## Part 1 — Move Longfellow 2905 activity to 2905.1

What's there today at 1416 N Longfellow Street, on account **2905 - Equity**:

- 9 deposit lines totalling **$180,882.78**
- 10 journal entry lines totalling **$230,882.78** in credits (this includes the $50,000 "Deposit Including Earnest" JE that shows at the top of your register)
- No bills, checks, or credit card lines touch 2905 at this project

Account **2905.1 - Equity Partner #1** already exists as a child of 2905 and already carries some Longfellow activity ($36,000 in deposits, plus a $15,000 check line).

The change:

1. Repoint all 9 Longfellow deposit lines from 2905 to 2905.1.
2. Repoint all 10 Longfellow journal entry lines from 2905 to 2905.1, so the register, balance sheet, and drill-downs all agree.
3. Leave every other project's 2905 activity untouched (2905 is used by 9 other projects).

After the move, Longfellow 2905 shows $0.00 and 2905.1 shows the full combined equity balance. Total equity for the project is unchanged.

## Part 2 — Parent accounts are no longer selectable

Rule: if an account has at least one active child account, the parent can no longer be chosen on any transaction. Only the children are selectable. Accounts with no children behave exactly as they do now.

Where this applies:

- Account search pickers (bills, bill review/ML entry, batch bill lines)
- Journal entry lines
- Deposits (single, edit, and multi-entry batch)
- Write checks and edit check
- Credit card charges

Parents still appear everywhere else — chart of accounts, balance sheet, job costs, registers, and reports — with their children rolled up underneath, exactly as today. Existing historical transactions posted to a parent are not changed or blocked; only new selections are prevented.

In the search pickers the parent row will still be visible as a non-clickable grouping header (greyed out) so the hierarchy stays readable, with its children indented beneath it. In dropdown-style selects the parent is rendered as a disabled group label.

## Technical notes

- Data changes are two scoped `UPDATE`s on `deposit_lines` and `journal_entry_lines`, filtered by `project_id = 7e70c2e5-...` and `account_id = <2905>`, run as data operations (no schema change). Journal entries stay balanced because only the account reference changes, not amounts or sides.
- A shared helper (e.g. `src/lib/accountSelectable.ts`) computes the set of account ids that have active children from the already-loaded account list, exposed as `getParentAccountIds(accounts)` / `isAccountSelectable(account, parentIds)`.
- Wire it into `AccountSearchInput.tsx` and `AccountSearchInputInline.tsx` (render disabled, skip on click/Enter) and into the `Select`-based account lists in `JournalEntryForm.tsx`, `MakeDepositsContent.tsx`, `EditDepositDialog.tsx`, `MultiDepositTable.tsx`, `WriteChecksContent.tsx`, `EditCheckDialog.tsx`, `CreditCardsContent.tsx`, and the bill line tables.
- The helper must consider project-scoped accounts too, since children can be project-specific (2905.3 is scoped to one project) — a parent counts as blocked only when it has an active child visible in the current context.

## Verification

Re-query after the data move: Longfellow 2905 has zero remaining lines, 2905.1 carries the combined balance, deposits and their journal entries match line for line, and the Longfellow balance sheet total equity is unchanged at $251,882.78. Then confirm 2905 no longer appears as a selectable option in a deposit and a journal entry, while 2905.1 and 2905.2 do.
