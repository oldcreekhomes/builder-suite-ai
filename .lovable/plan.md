

# Make "Check Your Email" Checkmark Green

## Change

**File: `src/pages/Auth.tsx`** (line ~33)

Change the `CheckCircle` icon color from `text-primary` to `text-green-500`, and update the background circle from `bg-primary/10` to `bg-green-100` to match.

Current:
```tsx
<div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
  <CheckCircle className="h-8 w-8 text-primary" />
</div>
```

Updated:
```tsx
<div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
  <CheckCircle className="h-8 w-8 text-green-500" />
</div>
```

After this change, I will navigate to the auth page and trigger the signup success view in the browser so you can see it without needing to delete and re-register a user.

