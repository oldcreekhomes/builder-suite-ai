# Make the Edit Recurring window the same size as the real Credit Card screen

## What changes
- The Edit window for a memorized transaction currently stretches almost the full width of the browser (about 1,510px on your screen), so every field looks wider than on the real Credit Card screen.
- It will be narrowed to the same width as the Credit Card screen's working area, which is the page minus the left menus (about 1,320px on your screen). It will also stay centered, so the fields, columns and buttons line up the way they do on the real screen.
- The same size applies when you edit a memorized check, so both match their real screens.

## Technical details
- `RecurringTransactionsContent.tsx` edit `DialogContent`: replace `max-w-[95vw]` with `w-[calc(100vw-280px)] max-w-[1320px]` (keeps `max-h-[92vh] overflow-y-auto p-0`).
- No changes to `CreditCardsContent` / `WriteChecksContent` layout, so the regular screens stay exactly as they are.
