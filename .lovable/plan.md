## Change primary-contact fallback from Project Owner → Construction Manager

### UI
- `src/components/projects/ProjectNotificationsMatrix.tsx` — update the helper paragraph: replace "If no primary is set, the project owner is used." with "If no primary is set, the project's Construction Manager is used."

### Backend (edge function shared helper)
- `supabase/functions/_shared/notification-recipients.ts` — change the final fallback lookup:
  - Select `construction_manager, owner_id` from `projects`.
  - If `construction_manager` is set, fetch that user and use as primary.
  - If not, fall back to `owner_id` (safety net so emails never send with no sender).
  - Update the doc comment on lines 30–33 to say "project's Construction Manager" instead of "project owner".

No database changes. No other call sites reference this fallback text.