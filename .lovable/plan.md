# Broken PO Attachment: 2026-100N-0025

## What's happening
The purchase order `2026-100N-0025` (project `691271e6-e46f-4745-8efb-200500e819f0`) has a `files` entry pointing to:

`project-files/purchase-orders/691271e6.../1779214785855-ohp9i81l9g.pdf` — "126 Long View Dr - Construction Services Proposal.pdf"

That storage object **does not exist** in the bucket (confirmed via `storage.objects`). The database still holds the reference, so the UI keeps trying to open a file that isn't there — which is why it never opens no matter how many times you resend it.

Nothing is wrong with the viewer, permissions, or RLS. The file is simply missing from storage.

## Options — pick one

**Option A — Re-upload the PDF (recommended if you still have it)**
- You open the PO, delete the broken attachment, and re-upload "126 Long View Dr - Construction Services Proposal.pdf".
- No code or DB changes needed from me.

**Option B — Remove the dead reference**
- I run a one-line DB update to strip the broken file entry off PO `2726b35b-4858-4dfe-b23f-e1018616f55c` so the UI stops showing a phantom attachment.
- Use this if you don't have the original PDF anymore.

**Option C — Both**
- I remove the dead reference now, then you upload the PDF fresh when convenient.

## Which do you want?
Tell me A, B, or C and I'll proceed in build mode.
