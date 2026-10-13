# Live Capital One balances via Plaid

## What I need from you
1. **Plaid Client ID** and **Production Secret** (Plaid Dashboard -> Developers -> Keys). I'll ask for these through a secure form, so they never go in the code.
2. **Confirm Production access**, meaning a live bank. Capital One only works through Plaid's OAuth flow, and that needs Production approval plus the Plaid Dashboard "Application" profile filled in (company name, logo, website).
3. **OAuth redirect URI**: add `https://app.buildersuiteai.com/plaid/oauth` under Plaid Dashboard -> Developers -> API -> Allowed redirect URIs.
4. **Products enabled**: Balance and Transactions.

## What gets built
- **Connect Bank button** on each bank account in Chart of Accounts (for example, Capital One per project). It opens Plaid's secure sign-in window, where you log in to Capital One once.
- **Live balance** stored for each linked account, with a "last updated" time.
- **Cash Position** uses the live bank balance when an account is linked and falls back to the book balance when it isn't. It shows both, so any difference stands out.
- **Refresh button** pulls new balances right away. Balances also refresh automatically every morning.
- **Imported transactions (phase 2)** appear as a "Bank Feed" to match against existing checks and deposits in Reconcile. Nothing posts to the books automatically.

## Safety
- Bank access tokens are stored only on the server and are never sent to the browser.
- Each company sees only its own linked banks.
- Only users with accounting permission can connect or disconnect a bank.

## Technical details
- Edge functions: `plaid-link-token`, `plaid-exchange-token`, `plaid-refresh-balances`, `plaid-webhook`, and a scheduled daily refresh.
- New table `bank_connections` (home_builder_id, account_id, plaid item_id, encrypted access_token, institution, mask, current/available balance, last_synced_at), with tenant RLS. The token column is never selectable by clients.
- Frontend: `react-plaid-link`, plus an OAuth return route `/plaid/oauth`.
- The Cash Position shared component reads the live balance when present. This is one change and both dashboards update.
