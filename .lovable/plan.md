# Connect Bank Accounts: off for everyone by default, owners included

## What changes
1. Turn **Connect Bank Accounts** off for every person in the company right now, owners included (this includes Matt Gray).
2. New employees and new owners start with it off too.
3. The owner is still the only person who can turn it on, for themselves or anyone else.

## Technical details
- Migration: `UPDATE user_notification_preferences SET can_connect_bank_accounts = false`; keep the column default false; change the guard trigger so inserts always force false (no owner exception). Updates stay owner-only.
- `useNotificationPreferences.tsx`: remove `can_connect_bank_accounts: true` from the owner defaults.
- Save a project memory: new access switches default OFF for everyone, owners included, unless the user says otherwise.
