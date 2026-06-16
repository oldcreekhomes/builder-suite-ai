Update `src/components/MyProjectsCard.tsx`:

Change the Supabase query in `MyProjectsCard` to return projects where the current user is **either** the construction manager **or** the accounting manager:

```ts
.or(`construction_manager.eq.${user.id},accounting_manager.eq.${user.id}`)
```

Replace the existing `.eq('construction_manager', user.id)` filter with the `.or(...)` filter. No other changes — same select, same ordering, same status grouping, same UI.

This will surface all of Erica's projects (she's the accounting manager on many) in the My Projects card.