# Make Deposit Bank Defaults Company-Safe

## What will change
- Keep the single clean starting row and today’s date.
- Resolve the signed-in user’s builder company before choosing an initial bank.
- Pre-fill `1015 - Capital One` only when the effective builder is Old Creek Homes, including Old Creek employees.
- Start the bank field blank for every other builder so they can choose from their own available banks.
- Continue applying a project’s configured default deposit bank when a project is selected; if none is configured, leave the builder’s bank dropdown available for manual selection.
- Apply the same company-safe behavior when adding a row, clearing the form, and resetting after a successful save.

## Tenant safety
- Identify Old Creek Homes by its verified builder ID, not by company-name text.
- Never place the Old Creek Capital One account ID into another builder’s row.
- Preserve the existing company isolation on account choices and project-specific bank settings.

## Shared behavior
- This remains one shared Enter Multiple Deposits screen reached from both Owner and Accountant dashboards, so the fix is implemented once and both dashboards receive it.
- Enter Multiple Checks remains shared between both dashboards and already sources bank defaults from the selected project rather than a hardcoded company account.

## Verification
- Verify an Old Creek user sees one row with today’s date and Capital One.
- Verify a non-Old Creek builder sees one row with today’s date and a blank bank field.
- Verify project selection applies that project’s configured default bank for either builder.
- Verify Add Row, Clear, and post-save reset preserve the correct company behavior.
- Run the project’s type and build checks.
