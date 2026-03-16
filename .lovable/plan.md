

## Plan: Fix stale saved data overriding updated defaults

### Root Cause
The autosave we just implemented loads saved form data from the database on mount. The old scope of work (without sections I-L updates) was saved before the defaults were changed, so it keeps overriding the new defaults.

### Fix
Two changes in `src/components/templates/SubcontractorContractForm.tsx`:

1. **When loading saved data, prefer the NEW default for `scopeOfWork` and `scopeOfWorkContinued` if the saved version matches the OLD defaults** — This is fragile and complex.

**Better approach**: Simply don't persist `scopeOfWork` / `scopeOfWorkContinued` from saved data if they match old stale values. But this is also tricky.

**Simplest approach**: Add a one-time migration — when loading saved data, if the `scopeOfWork` or `scopeOfWorkContinued` fields still contain the old text (e.g., checking for a known old string like "Water main and service installation"), replace them with the new defaults. This ensures existing users get the update.

### Implementation — `SubcontractorContractForm.tsx`

In the `useEffect` that loads saved data (~line 174), after merging `savedData.fields`, check if `scopeOfWork` or `scopeOfWorkContinued` contain stale content (e.g., the old "I. Water" section text like `"Water main and service installation"`). If so, overwrite those two fields with the current `DEFAULT_FIELDS` values.

This is a ~5-line addition to the existing load effect. One file changed.

