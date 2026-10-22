# Replace "Cash Position Negative Filter" access with "Connect Bank Accounts"

## What changes
1. **Remove** the "Cash Position Negative Filter" switch from Edit Employee → Access. The Negative button on Cash Position goes back to showing for everyone who sees Cash Position (same red/green colors, same spot next to the days dropdown).
2. **Add** a new "Connect Bank Accounts" switch under Accounting, in alphabetical order (between "Close the Books" and "Delete Invoices"). Description: "Connect, reconnect and link bank accounts on Cash Position."
3. On Cash Position (Accountant and PM dashboards), the **Add Bank / Connect** button only appears for people with this switch on. Everyone else still sees balances and the Refresh button.
4. Who gets it: owners on by default; everyone else off. Only the owner can turn it on or off for someone (greyed out for others, and blocked by the system, not just the screen).

## Technical details
- Migration: rename `can_view_cash_negative_filter` to `can_connect_bank_accounts` on `user_notification_preferences`, set it true for existing owners, and update the guard trigger to the new column (owner-only changes; inserts default true for owners, false otherwise).
- Plaid edge function: reject link-token / exchange / account-assignment actions unless the caller has `can_connect_bank_accounts`; Refresh stays open to anyone with Cash Position.
- `useNotificationPreferences.tsx`: rename the field, owner default true.
- `CashPositionCard.tsx`: remove `canNegative` gating; gate `PlaidConnectButton` on the new flag.
- `EmployeeAccessPreferences.tsx`: swap the switch and place it alphabetically.
