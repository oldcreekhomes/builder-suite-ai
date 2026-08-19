# Restore direct single-file sharing

## Confirmed current state
- Share ID `1kdh0fnly94eqo3j9m9hpf` is a fresh database record with `share_type: file` and exactly one PDF: `Lots 13-19 Architecture.pdf`.
- The folder names stored before the filename describe its internal location; they are not shared content and must not become navigation.
- The current preview opens this link correctly with one PDF row and **Download**. The live `buildersuiteml.com` page still renders the old `Drawings` folder flow.

## Implementation
1. Keep **Share File** creating a new unique seven-day record for the selected file on every action.
2. Make `share_type: file` a hard boundary in the public viewer: render the selected file directly before any folder paths, folder lists, breadcrumbs, or Download All logic can run.
3. Display only the final filename, uploaded date, seven-day notice, and **Download** button. Do not show any folder or breadcrumb UI for file shares.
4. Leave true folder shares unchanged, including their existing hierarchy and Download All behavior.
5. Verify both known file links (`1kdh0fnly94eqo3j9m9hpf` and `1x3erc8a3sce05pvfwgpv`) open on their exact PDF rows with zero folder navigation, then update the live site and repeat the checks there.

## Scope guard
- No database schema, RLS, accounting, marketplace, storage, or unrelated UI changes.
- No automatic PDF opening or downloading.
- Existing links remain valid until their normal seven-day expiration.
