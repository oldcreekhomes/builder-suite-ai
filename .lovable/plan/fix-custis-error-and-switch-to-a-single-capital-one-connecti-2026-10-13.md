# Fix Custis error and switch to a single Capital One connection

## Why Custis failed
Plaid rejected the request before the Capital One sign-in window could open. Its message was: "At least one Data Transparency Messaging use case is required." This is a setting in your Plaid account, not a bug in the app.

**Your one step:** in Plaid, open Link -> Link Customization -> Data Transparency (https://dashboard.plaid.com/link/data-transparency-v5). Select a use case such as "Track and manage your finances" or "Accounting", then click Publish.

## Connect once, stay connected
Right now each job has its own link icon. That would mean signing in to Capital One once per job, so I'll replace it:

- **One "Connect Capital One" button** in the Cash Position header. You sign in once and check every Capital One account. The connection stays saved until you choose to disconnect it.
- **Each job gets a small dropdown** on its bank balance to pick which Capital One account belongs to it (for example "Checking ...4821"). This is set once per job and then remembered.
- **The existing refresh button** updates every connected account at once. There are no other refresh buttons.
- The per-job link icons are removed.
- Error handling: if Plaid refuses a request, you'll see a short message instead of the app's red error box.

## Technical details
- Split storage into `bank_connections` (one row per Plaid login: item_id, access_token, institution; the token is never sent to the browser) and `bank_connection_accounts` (Plaid account id, mask, name, balances, plus an optional job and book account link). The existing table is empty and will be restructured.
- Edge function `plaid`:
  - exchange saves the login and every account it includes.
  - refresh calls `/accounts/balance/get` once per login and updates all of its accounts.
  - a new `assign` action links one Plaid account to a job's bank account.
- The CashPositionCard header gets a connect button; the balance cell gets an account picker. Both dashboards still share the one component; the PM dashboard shows balances only.
- PlaidConnectButton catches errors coming back from the server and shows them as a short message, instead of letting them surface as an app error.
