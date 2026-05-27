I found the issue: some bill-note paths still save notes in the old `User: note` format with no date, even though the newer notes dialog correctly uses `User | MM/DD/YYYY: note`.

Plan:
1. Update every bill note creation path to use the shared date-stamped formatter:
   - Reject bill notes
   - Resend-for-review notes
   - Edit bill response notes
   - Existing add-note flow already uses the correct formatter
2. Backfill the affected Matt Gray notes that are currently displaying `(no date)` using the best database evidence available:
   - The bill rows show Matt’s account updated those notes today, `2026-05-27`, and the app session is logged in as Matt Gray.
   - I will stamp those Matt Gray legacy note blocks as `Matt Gray | 05/27/2026: ...` instead of leaving `(no date)`.
3. Keep the existing notes dialog presentation the same; no new UI unless needed.
4. Verify by re-querying the affected bill notes and checking the parsing logic so they render with dates instead of `(no date)`.