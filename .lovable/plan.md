## Fix the Supabase folder share

1. Publish the current app version containing the folder-tree implementation in `SharedFolder.tsx`.
2. Keep the generated URL exactly in the Supabase format—no Lovable URL:
   `https://nlmnwlvmmkngrgatnzkj.supabase.co/functions/v1/share-redirect?id=<shareId>&type=f`
3. Verify the existing share `wsequypkabsvp5dnmnslqg` end-to-end through that exact URL.
4. Confirm the root displays the saved 27 folders rather than the flat list of 30 files, and confirm opening a folder displays only its contained files with breadcrumbs.

No database repair or new link is needed: the existing record already contains 27 folders and explicit relative paths.