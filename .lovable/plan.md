# Nob Hill 4730 - Appliances: "Sent" status vs. "Not sent" vendors

## What the data actually shows

For bid package 4730 - Appliances at 100 Nob Hill Ct:

- Package `status` = **sent**, but the package's own send timestamp (`sent_on`) is **empty**.
- All three vendors (Bray and Scarff, M & M Appliance, ABW Appliances) have **no** per-vendor send timestamp, which is why every row reads "Not sent".
- M & M Appliance and ABW Appliances **do** have reminder timestamps: 2026-08-21 04:30 ET.
- Bray and Scarff responded "Will Bid" on 2026-08-14 and has a price of $112,769.94 with 6 proposal files.

So: the bid package invitation was never sent through the app's Send Bid Package flow (that flow always stamps both the package and each vendor). The status was set to "Sent" another way — the Status dropdown on the row/details lets anyone pick "Sent" with no email going out. Once status is "Sent", the nightly reminder job picks the package up and emails vendors "REMINDER: Bid Coming Due" — which is the email M & M and ABW received on Aug 21, and why they're asking questions about a package they never got an invitation for. Bray and Scarff clearly received something earlier (they responded Aug 14), most likely from a prior manual/individual send whose stamp predates current tracking or from the reminder link path.

Short answer for you: the original invitation was **not** sent from the app. Vendors only got reminder emails.

## Proposed fixes

1. Stop the Status dropdown from silently faking a send.
   - Remove "Sent" as a manually selectable status (leave Draft / Closed and let sends drive "Sent"), or require confirmation and record that it was set manually rather than emailed.

2. Don't let the reminder job email vendors who were never invited.
   - Skip a vendor in `send-bid-reminders` when that vendor has no per-vendor send timestamp, so reminders can never precede an invitation.

3. Make the send stamp reliable and visible.
   - Check the result of the per-vendor and package stamp writes after the send email succeeds and surface a warning if either fails, instead of silently leaving "Not sent".
   - Show a clear "Sent to 0 of 3 vendors" style indicator on the package header so a package marked Sent with no vendor sends is obvious at a glance.

4. Immediate action for this package: send the 4730 - Appliances invitation to M & M Appliance and ABW Appliances (and Bray and Scarff if you want them re-invited) through Send Bid Package so the real dates get recorded.

## Technical notes

- `project_bid_packages` for this package: `status='sent'`, `sent_on IS NULL`.
- `project_bids` for this package: `email_sent_at IS NULL` on all 3 rows; `reminder_sent_at = 2026-08-21T08:30:03Z` on two.
- `src/components/bidding/SendBidPackageModal.tsx` (~line 267-285) and `SendSingleCompanyEmailModal.tsx` (~line 221-243) are the only paths that stamp `sent_on` / `email_sent_at`; neither result is error-checked.
- `src/components/bidding/BiddingTable.tsx` `handleUpdateStatus` (via `useBiddingMutations`) is the manual-status path used by the dropdowns in `BidPackageDetailsModal.tsx` and `components/BiddingTableRowContent.tsx`.
- `supabase/functions/send-bid-reminders/index.ts` selects packages with `.eq('status','sent')` and only checks `reminder_sent_at` / bid status per vendor — add an `email_sent_at NOT NULL` requirement per vendor.
