In `src/components/multi-entry/MultiDepositTable.tsx`, changing "Default Date" only affects new rows via `blankRow(defaultDate)` — existing rows keep whatever date they had.

## Fix
Update the Default Date handler so it propagates to every row's `depositDate` at the same time:

```ts
const handleDefaultDateChange = (d: Date) => {
  setDefaultDate(d);
  setRows((rs) => rs.map((r) => ({ ...r, depositDate: d })));
};
```

Wire it into the header `DateInputPicker`:
```tsx
<DateInputPicker
  date={defaultDate}
  onDateChange={(d) => d && handleDefaultDateChange(d)}
/>
```

Per-row date pickers stay editable — a user can still override an individual row after changing the default. That override just gets replaced the next time they change the default (which matches the "change all dates" behavior you asked for).