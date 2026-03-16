

## Problem

The `Field` component (lines 163-181) is defined **inside** the `SubcontractorContractForm` component. Every keystroke calls `update()`, which triggers `setFields()`, which re-renders the parent. On re-render, React sees a **new** `Field` function reference each time, treats it as a different component, and **unmounts/remounts** the input — destroying focus after every single character.

## Solution

Move the `Field` component **outside** of `SubcontractorContractForm` and pass `value` and `onChange` as explicit props instead of closing over `fields` and `update`. This way React sees the same stable component reference across re-renders, preserving input focus.

### Changes — single file: `src/components/templates/SubcontractorContractForm.tsx`

1. **Extract `Field` above the main component** (before line 43), converting it to accept `value: string` and `onChange: (value: string) => void` props instead of `fieldKey`.

2. **Update all `<Field>` usages** inside the render to pass `value={fields[key]}` and `onChange={(v) => update(key, v)}` instead of `fieldKey={key}`.

No other files need changes. This is a standard React pattern — defining components inside render functions causes remounting on every state update.

