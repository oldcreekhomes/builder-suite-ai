# Add Multiple Project Entries to the Accountant Dashboard

## Changes
- Reuse the existing **Multiple Project Entries** panel unchanged on the accountant dashboard, positioned on the far right like the owner dashboard.
- Place the accountant jobs table and panel in the same two-column layout used by the owner view, with the table taking the flexible space and the panel retaining its established width.
- Shorten the table header from **Accounting Manager** to **Manager**.
- Show each accounting manager as initials instead of the full name, using first and last initials and retaining `-` when no manager is assigned.
- Display only the street portion of each project address in the table, removing city, state, and ZIP while preserving the full stored address and existing search behavior.
- Tighten the address and manager columns so the remaining accounting and bill columns stay readable without being compressed.

## Verification
- Confirm both Multiple Deposits and Multiple Checks links work from the accountant dashboard.
- Check the accountant view at the supplied desktop width to ensure the table and right-side panel fit without overlap or clipped text.
- Confirm sorting, searching, date controls, bill counters, and row navigation still work.
- Confirm the owner dashboard remains unchanged.
