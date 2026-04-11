

## Plan: Update All Email Sender Addresses to New Domain

Your `transactional.buildersuiteml.com` domain is verified in Resend. Now we need to update all edge functions to send from the new domain instead of the old `buildersuiteai.com` one.

### What Changes

**11 edge functions** need their sender `from` address updated:

| Edge Function | Old `from` | New `from` |
|---|---|---|
| send-employee-approved-email | `BuilderSuite ML <noreply@transactional.buildersuiteai.com>` | `BuilderSuite ML <noreply@transactional.buildersuiteml.com>` |
| send-accounting-reports | same pattern | same update |
| send-issue-closure-email | `BuilderSuite AI <noreply@...>` | `BuilderSuite ML <noreply@transactional.buildersuiteml.com>` |
| send-employee-invitation | same pattern | same update |
| send-signup-emails | (4 occurrences) | same update |
| send-password-reset | same pattern | same update |
| send-bid-package-email | `${senderName} <noreply@...>` | update domain only |
| send-po-email | `${senderCompanyName} <noreply@...>` | update domain only |
| send-bid-submission-email | `${senderCompanyName} <noreply@...>` | update domain only |
| send-marketplace-message | `Builder Suite AI <marketplace@...>` | `BuilderSuite ML <noreply@transactional.buildersuiteml.com>` |
| send-schedule-notification | `${senderCompanyName} <noreply@...>` | update domain only |

**Additional updates across all files:**
- Footer links: `www.buildersuiteai.com` changed to `www.buildersuiteml.com`
- Redirect URLs in `handle-bid-response` and `handle-schedule-response`: `buildersuiteai.com` to `buildersuiteml.com`
- Share redirect in `share-redirect`: `app.buildersuiteai.com` to `app.buildersuiteml.com`
- Bid submit links in email HTML templates
- Display name standardized to **BuilderSuite ML** everywhere
- Update `docs/email-standards.md` to reflect new domain

**All 12+ edge functions will be redeployed** after the changes.

### No Risk

This is a find-and-replace operation across known files. No logic changes, no database changes. Emails will start sending from the verified new domain immediately after deployment.

