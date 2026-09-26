# Simplify Multiple Deposit Defaults

## What will change
- Remove the five temporary pre-filled deposit rows and their project, payer, description, and amount values.
- Open Enter Multiple Deposits with exactly one row.
- Pre-fill only:
  - today’s selected default date
  - `1015 - Capital One` as the deposit bank
- Leave Project, Received From, Check #, Account, Description, and Amount blank.
- Make Clear and a successful Save return the screen to the same single clean row.
- Keep newly added rows aligned with the same default date and Capital One bank selection.

## Shared behavior confirmation
- The Owner and Accountant dashboards already render the same `Multiple Project Entries` panel.
- Both panels link to the same Enter Multiple Deposits screen and the same Enter Multiple Checks screen.
- The change will be made once in the shared deposit screen; there will not be separate owner/accountant versions to maintain.
- Enter Multiple Checks remains unchanged by this request and already opens through the same shared route from both dashboards.

## Verification
- Confirm the initial deposit screen, Clear action, and post-save reset each show one row with only Date and Capital One filled.
- Confirm Add Row uses the same permitted defaults.
- Run the project’s type and build checks.
