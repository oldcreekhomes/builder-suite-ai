# Show uploader initials in the Files "Uploaded By" column

Right now every row in the Files table shows a dash. The file list expects each file to carry an `uploader` object with first/last name, but the data hook only attaches an email under a different property name, so nothing ever renders. Folders never had uploader data attached at all.

## What will change

- Files show the uploader's initials (e.g. "MG") from their first and last name, falling back to the first letters of their email when a name is missing.
- Folders show the initials of the person who created the folder, using the folder record's creator.
- Folders that only exist implicitly (inferred from a file path, with no folder record) keep a dash, since there is no creator on record.
- Initials render as plain text in the same column; hovering shows the full name.

## Technical details

- `src/hooks/useProjectFiles.tsx`: select `id, email, first_name, last_name` from `users` and attach the result as `uploader` (keeping `uploaded_by_profile` for existing consumers).
- `src/hooks/useProjectFolders.tsx`: after loading folders, look up `created_by` users and attach a `creator` object with the same shape.
- `src/components/files/SimpleFileManager.tsx`: pass each folder's creator through with the folder items handed to the list.
- `src/components/files/SimpleFileList.tsx`: add a small `getInitials()` helper, use it for the file rows (replacing the current full-name render) and for the folder rows' Uploaded By cell, with a `title` attribute holding the full name.
