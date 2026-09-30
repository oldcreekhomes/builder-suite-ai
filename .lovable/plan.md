# Fix bill counts on Active Jobs (Current / Late / Rejected / Pay)

## What's wrong today
- **Current** and **Late** only look at bills in **Review**. Approved and Rejected bills never count as late. That's why 2401 N Potomac shows no late bills even though most of its 54 Approved bills are past due (red dates).
- Due dates are read as midnight UTC, so a bill due today counts as late a day early.

## New rules (one bill per project, unpaid only; archived bills ignored)
- **Current** = Review bills that are not past due (same as now).
- **Late** = every past-due bill in **Review + Rejected + Approved**.
- **Rejected** = all Rejected bills (same as now).
- **Pay** = all Approved bills (same as now, matches the Approved tab count).

A past-due Approved bill will show in both Late and Pay, and a past-due Rejected bill in both Late and Rejected, since Late means "overdue and still unpaid".

## Technical details
- File: `src/hooks/useBillCountsByProject.ts`.
- Late filter: status in (draft, posted, void), not archived, not a reversal, due_date < today.
- Compare due dates as local `yyyy-MM-dd` strings instead of `new Date(due_date)` to fix the off-by-one.
- Current: draft, not archived, no due date or due_date >= today.
- The Late badge's click-through stays pointed at the bills page.
