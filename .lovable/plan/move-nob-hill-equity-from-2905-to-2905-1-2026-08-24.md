# Move Nob Hill equity from 2905 to 2905.1

Data-only change. No code edits.

## What's there now

At Nob Hill, account **2905 - Equity** carries 26 deposit lines totalling **$265,000.00**, plus the 26 matching journal entry lines from those deposits. No bills, checks, or credit card lines at Nob Hill touch 2905.

Account **2905.1 - Equity Partner #1** already exists (same owner, equity type).

## The change

1. Repoint all 26 Nob Hill deposit lines from 2905 to 2905.1.
2. Repoint the 26 corresponding Nob Hill journal entry lines from 2905 to 2905.1, so the register, balance sheet, and drill-down all agree.
3. Leave every other project's 2905 activity untouched.

## Keeping 2905 visible but not selectable

2905 is still actively used by 11 other projects, so deactivating it company-wide would break those. Instead, exclude 2905 at the **Nob Hill project level** (the same project-account exclusion the Edit Project chart of accounts uses). Result at Nob Hill: 2905 no longer appears in any account picker, but historical entries and reports still show it.

If you want it hidden everywhere and not just Nob Hill, send the screenshot and I'll adjust.

## Verification

After the change I'll re-query: Nob Hill 2905 has zero remaining lines, 2905.1 at Nob Hill totals $265,000.00, deposits and their journal entries match line for line, and the Nob Hill balance sheet total equity is unchanged.
