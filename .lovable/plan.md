## Fix: keep newest-first navigation, only flip the displayed number

The previous fix reversed `filteredEntries` so #1 became the oldest. That fixed the number labels but broke navigation direction — landing on "New" and pressing the left arrow now loads #1 (oldest) instead of #6 (newest).

The correct behavior: navigation order stays newest → older (left arrow = older, right arrow = newer, same as before), while the Journal Entry # label still ascends chronologically (oldest = #1, newest = highest).

### Change in `src/components/journal/JournalEntryForm.tsx`

1. **Revert the reversal** of `filteredEntries` (line ~83-91) back to the original newest-first order so `goToPrevious`/`goToNext` and the New→back-arrow handoff behave as they did originally.
2. **Compute the displayed Journal Entry #** from `filteredEntries.length - currentEntryIndex`:
   - In viewing mode: `Journal Entry # = filteredEntries.length - currentEntryIndex` (index 0 = newest → highest #).
   - In new-entry mode: `Journal Entry # = filteredEntries.length + 1` (unchanged).
3. **Position counter** (line 138): mirror the same inversion so "Position N of M" matches the number — `currentPosition = filteredEntries.length - currentEntryIndex` in viewing mode.

### Result
- Land on form → New entry shows #6 (5 existing + 1).
- Press ← → loads newest existing entry, shows #5.
- Press ← again → #4, then #3, #2, #1.
- Press → reverses back toward newer entries.
- Attachment unlock behavior from the prior fix stays in place.
