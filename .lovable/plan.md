## Plan

1. **Fix reopened deposit line labels**
   - Update the Make Deposits load logic so saved Chart of Accounts lines display the project-specific account name override, not the base chart name.
   - This will make saved lines show the North Potomac equity names exactly as configured in Edit Project / project chart of accounts.

2. **Fix account lookup while saving deposits**
   - Update the fallback account resolver used during Save so it matches against:
     - account code
     - base account name
     - project override display name
     - full `code - display name`
   - Keep matching scoped to the selected project’s chart of accounts, including project-specific accounts and excluding accounts removed from that project.

3. **Fix blank account after save/reload**
   - Ensure account rows reload from the saved `account_id` and render with the effective project account name.
   - Make the inline account picker preserve the selected `accountId` and display text consistently.

4. **Verify the affected deposit flow**
   - Check that the 06/15 Old Creek Homes deposit displays the correct equity account name instead of the wrong base label.
   - Check that the 06/17 Erica Gray deposits reopen with the selected equity account populated instead of blank.
   - Check that searching `Equity` still shows the parent plus all eligible child equity accounts for the North Potomac project.