# New "Drawings" module

## What you get
- A new **Drawings** item in each job's left menu, right under Files.
- Upload a full drawing set (PDF). The app splits it into one sheet per page.
- Each sheet is read for its **sheet number and title** (like "A-101 First Floor Plan"). You can fix any it reads wrong before saving.
- If you upload a sheet number that already exists, it becomes **Version 2, 3, ...** of that sheet. Old versions are kept, never deleted.
- The Drawings page shows **only the current version** of every sheet, sorted by sheet number and grouped by discipline (Architectural, Structural, Civil, MEP, etc.).
- Click a sheet to view it; a **Version history** list shows every older version with upload date and who uploaded it, and you can open any of them.
- Each upload also records which set it came from (e.g. "Permit Set 11/20/2026") so you can see what changed in each round.
- Delete a single version or a whole sheet (owners/employees with access).

## How matching works
- Same sheet = same sheet number on the same job (A-101 matches A-101; case and spaces ignored).
- On the review screen before saving, each page is tagged **New** or **Version N of A-101**, so you can see and change it before anything is saved.

## Not changed
- Existing Files -> Drawings folders stay where they are. Optionally later we can import them.

## Technical details
- Tables: `drawing_sheets` (project_id, home_builder_id, sheet_number, title, discipline, current_version) and `drawing_sheet_versions` (sheet_id, version_number, file_path, set_name, page_index, uploaded_by, uploaded_at). RLS by home_builder_id, GRANTs included, audit trigger.
- Private storage bucket `project-drawings`, tenant-scoped storage policies.
- Split PDF into single-page files in the browser (pdf-lib); read sheet number/title by reusing the existing `detect-sheet-info` function per page.
- Version number assigned in a DB function so two uploads at once can't both become "Version 2".
- Route `/project/:id/drawings`, sidebar entry, access gated like Files.
