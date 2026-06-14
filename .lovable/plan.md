# Fix Issue Resolved Email Template

Three changes to how `Issue Resolved on BuilderSuite ML` emails go out.

## 1. Personalize the greeting per recipient

Today, one email is sent: `TO = author`, `CC = selected users`. Everyone sees the author's first name ("Erica,") because the greeting is baked into one HTML body. We need each recipient to see their own first name.

**Change:** Send a separate email to each recipient instead of one email with CCs.

- In `src/hooks/useIssueMutations.ts` (`resolveIssue`), build a single `recipients` array: the author + each selected CC user, each with `{ email, firstName }`. De-duplicate by email (case-insensitive) so the author isn't double-emailed if also selected.
- Pass the full `recipients` array to the edge function in one invoke call.
- In `supabase/functions/send-issue-closure-email/index.ts`, accept `recipients: { email, firstName }[]` (keep `authorEmail`/`ccEmails` as a fallback so older callers don't break). Loop and call `resend.emails.send(...)` once per recipient with `to: [recipient.email]`, no CC, and the greeting `${recipient.firstName},`. Return `{ success, sent, failed }`.
- Update the success toast to say "Resolution email sent to N recipient(s)."

Each person now gets a personal email addressed to them. No one sees who else was notified (which is also better for privacy).

## 2. Real file-type icons in the Solution Files row

Today every file renders as a generic gray document emoji (📄) with label "File1", "File2", etc.

**Change in the email template:**
- Derive the extension from the storage path (e.g. `.pdf`, `.docx`, `.xlsx`, `.png`).
- Replace the 📄 emoji with a colored type label rendered as an inline-block "badge" (a small rounded rectangle), since Gmail/Outlook do not reliably render external SVGs and emoji are monochrome on most clients. Colors match the in-app `fileIconUtils` convention:
  - PDF → red (`#dc2626`)
  - DOC/DOCX → blue (`#2563eb`)
  - XLS/XLSX/CSV → green (`#16a34a`)
  - PPT/PPTX → orange (`#ea580c`)
  - PNG/JPG/JPEG/GIF/WEBP → purple (`#7c3aed`)
  - anything else → gray (`#6b7280`)
- Badge shows the extension in uppercase (e.g. `PDF`, `DOCX`) in white on the colored background, followed by the link text (still `File1`, `File2`, … to keep filenames out of the email per current behavior).

This gives the same visual cue the rest of the app uses without depending on image hosting.

## 3. Black labels for "Solution Files" and "Solution"

In the issue details table, the labels `Solution Files:` and `Solution:` are red (`#dc2626`). The user wants them black like `Issue:`, `Category:`, `Date Resolved:`.

**Change:** Remove `color: #dc2626;` from those two `<td>` label cells in `supabase/functions/send-issue-closure-email/index.ts`. Header bar stays green (explicitly left alone per user).

## Files touched

- `src/hooks/useIssueMutations.ts` — build `recipients` array and pass to edge function.
- `supabase/functions/send-issue-closure-email/index.ts` — accept `recipients`, loop sends with per-recipient greeting; rebuild `solutionFilesHtml` with colored extension badges; remove red label color.

No DB changes, no new secrets, no UI changes to the Resolve dialog.
