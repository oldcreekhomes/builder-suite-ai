# Fix: clicking a just-added receipt on Credit Cards opens an error page

## What's wrong
On a new Credit Card entry, an added file isn't actually uploaded until you hit Save. Until then it has no storage link, so clicking the red PDF icon opens a blank address, which shows the "InvalidKey" error. Your receipt isn't damaged, and it will upload when you save. Only Credit Cards has this problem. Checks, deposits and journal entries upload the file right away.

## Fix
- If you click a file that hasn't been saved yet, it opens in the usual file preview straight from your computer's copy, with no error page.
- After Save, files open from storage the same way they do now.
- Uploads, saving and the books stay the same.

## Technical details
- `useCreditCardAttachments.ts`: keep the `File` on the pending items it combines (e.g. `localFile`).
- `AttachmentFilesRow.tsx`: when `file_path` is empty and `localFile` exists, open a blob URL (`URL.createObjectURL`) in the universal preview, or a new tab as a fallback. Never build a storage URL from an empty path.
- Verify by adding a PDF to a new credit card entry, clicking it before saving, then saving and clicking it again.
