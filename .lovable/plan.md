# The PDF Bytes Are Gone — Here's What's Actually Possible

## The hard truth
I searched storage every way I can:
- By the exact filename `1779214785855-ohp9i81l9g.pdf` → not found
- By display name `126 Long View Dr - Construction Services Proposal.pdf` → not found in any bucket
- By exact file size (346,505 bytes) across the entire `project-files` bucket → no match
- By vendor bid proposals attached to project `691271e6...` (in case it was uploaded as a bid proposal) → no match

**The file was deleted from Supabase Storage.** Only the JSON reference on PO `2026-100N-0025` still points to where it used to live. There is no other copy on our side. No code change, no viewer tweak, no permission fix, and no re-render can produce a file whose bytes no longer exist. The app can only display what storage still holds.

## Real recovery paths (in order of likelihood)

1. **Check the sender's email / their own records.** The vendor who sent "126 Long View Dr - Construction Services Proposal.pdf" still has it. That's the fastest way to get the actual document back.
2. **Supabase Point-in-Time Recovery.** Storage objects can be restored from PITR if the project is on a Supabase plan that includes it AND the deletion is inside the retention window. This is done from the Supabase dashboard by you — I cannot trigger it. If you want, I can point you at the exact dashboard page.
3. **Your own backups**, if you keep any (Google Drive, Dropbox, email archive, etc.).

## What I can do in the app right now
Only one thing, and it's cosmetic:

- **Strip the dead reference** off PO `2026-100N-0025` so the phantom PDF icon stops appearing and no one else wastes time clicking it. The PO itself is untouched — number, vendor, lines, amounts all stay. Only the broken attachment JSON entry is removed.

Say the word and I'll do that. Otherwise I'll leave the PO exactly as it is so you can recognize which one is missing its file while you hunt down a copy.

## What I will NOT pretend to do
- "Rebuild" or "regenerate" the PDF — I have no source content for it.
- "Refresh the cache" — there is no cache issue; the origin object 404s.
- Change RLS / permissions / viewer code — none of that is the problem.
