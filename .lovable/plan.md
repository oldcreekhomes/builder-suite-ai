
Root cause is now clear from the code and live data:

1. The code already contains the new I/J/K/L text in `DEFAULT_FIELDS.scopeOfWork`.
2. The live app is still loading an older saved `scopeOfWork` from `template_content` (`subcontractor-contract-form-data`), and that saved value still has the old text:
   - `Water service lateral connections`
   - `Pressure testing and bacteriological testing`
   - old J/K items
   - no section L
3. The current migration check is too narrow, so it never catches this actual stale saved content.
4. On-screen page 5 is also incomplete: it only shows a note, not the continued scope content, so the application does not visually match the print layout.

Implementation plan:

1. Fix the stale-data migration in `src/components/templates/SubcontractorContractForm.tsx`
   - Replace the current one-string migration check with a stronger check for the actual old I/J/K content now stored in Supabase.
   - When old content is detected, overwrite `mergedFields.scopeOfWork` with the exact updated default text for sections I, J, K, and L.
   - This ensures the live form immediately shows the updated wording instead of the stale saved version.

2. Make the migration persist
   - After loading and replacing stale scope text in state, allow autosave to write the corrected `scopeOfWork` back to `template_content`.
   - That updates the DB row so refreshes and future visits keep the corrected version.

3. Update the on-screen continued scope page
   - Change page 5 in `SubcontractorContractForm.tsx` from the placeholder note to an actual view of the continued scope content so the application reflects what prints.
   - Keep it driven from the same `fields.scopeOfWork` source so UI and print stay in sync.

4. Keep print output tied to the same corrected field
   - The print function already uses `fields.scopeOfWork`, so once the stale load is fixed, the printout will automatically show the corrected I/J/K/L sections too.
   - No separate print-only content should be introduced.

Files to change:
- `src/components/templates/SubcontractorContractForm.tsx`

Exact outcome after implementation:
- Live template page shows the updated I, J, K, and L text from your attachment.
- Print output shows the same updated sections.
- The old saved Supabase value gets replaced so the issue does not keep coming back.
