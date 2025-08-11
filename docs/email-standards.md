# BuilderSuite AI Email Standards

## Standard Email Configuration

**ALWAYS use this email sender address for ALL BuilderSuite AI functions:**

```
"BuilderSuite AI <noreply@transactional.buildersuiteai.com>"
```

## Verified Domain

- Domain: `transactional.buildersuiteai.com`
- Status: ✅ Verified in Resend
- MX Records: ✅ Configured
- DKIM: ✅ Active

## DO NOT USE:

- ❌ `onboarding@resend.dev` (Resend default)
- ❌ `noreply@buildersuiteai.com` (Not verified)
- ❌ Any other domains

## Functions Using Correct Email:

1. ✅ `send-employee-invitation`
2. ✅ `send-employee-approval-email`
3. ✅ `send-employee-approved-email`
4. ✅ `send-bid-package-email`
5. ✅ `send-bid-submission-email`
6. ✅ `send-po-email`
7. ✅ `send-schedule-notification`
8. ✅ `send-password-reset`
9. ✅ `reset-user-password`

## Template for New Email Functions:

```typescript
const emailResponse = await resend.emails.send({
  from: "BuilderSuite AI <noreply@transactional.buildersuiteai.com>",
  to: [recipientEmail],
  subject: "Your Subject Here",
  html: `Your email content here`,
});
```

**Remember: This prevents 403 errors and ensures consistent branding!**