## Problem
The schedule notification email sent to subcontractors lists tasks out of chronological order. The "Your Scheduled Tasks" table should display tasks from earliest start date to latest, but currently the tasks appear in whatever order they were retrieved from the database.

## Solution
Sort the tasks array by `start_date` before generating the HTML table in the `send-schedule-notification` edge function.

## File Changed
- `supabase/functions/send-schedule-notification/index.ts`

## Change Detail
In the `generateEmailHTML` function, before mapping `data.tasks` to HTML `<tr>` rows, create a sorted copy:

```ts
const sortedTasks = [...data.tasks].sort((a, b) => {
  return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
});
```

Then use `sortedTasks` for the `.map()` call that builds `tasksList`.

## Result
Subcontractors will see their scheduled tasks sorted chronologically from the closest start date at the top to the furthest out at the bottom.