## Fix Employee Activity status labels

**Problem:** Status says "Active today" for users whose last action was 16, 18, 20, even 24 hours ago. The current logic buckets anything ≤24 hours as "Active today" — which is misleading (24 hours ≠ today).

### New status logic (in `src/components/owner-dashboard/EmployeeActivitySection.tsx`)

Replace the `statusFor()` time bucketing with recency-accurate labels based on hours/days since last action (or last sign-in if no action):

| Recency of last activity | Label | Color |
|---|---|---|
| ≤ 1 hour | Active now | green |
| ≤ 8 hours | Active recently | green |
| Same calendar day (today) | Active today | green |
| Yesterday (calendar) | Active yesterday | yellow |
| ≤ 7 days | Active this week | yellow |
| ≤ 30 days | Idle 30d | red |
| > 30 days | Inactive | red |
| Never signed in | Never logged in | muted |

"Active today" will only show when the timestamp falls on the current calendar date in the viewer's local timezone — so a 24-hours-ago action will correctly read "Active yesterday", and 16–20 hours ago will read "Active yesterday" (or "Active today" only if it's still the same calendar date).

### Scope

- Pure presentation change in `EmployeeActivitySection.tsx`. No hook, RPC, or data changes.
- Keep existing column layout, badge component, and color tokens (just remap thresholds).
