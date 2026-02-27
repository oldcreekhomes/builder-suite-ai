

## Fix: Make the red toast error actually fire on validation failure

### Problem
The `handleFormError` callback was added but the toast never appears. Two issues:

1. **Array field error structure**: For `service_areas` (a `z.array()` field), react-hook-form may store the error under `errors.service_areas.root` rather than directly on `errors.service_areas.message`. The current check `if (errors.service_areas)` may find an object but the logic still doesn't reliably build a message.

2. **Fallback needed**: If no specific field is matched, the toast should still fire with a generic message so it never silently fails.

### Fix (single file)

**File: `src/components/companies/EditRepresentativeDialog.tsx`**

Update `handleFormError` to:
- Accept the `errors` parameter directly from react-hook-form's `handleSubmit`
- Check for `service_areas` errors using both direct and `.root` paths
- Add a fallback: if there are any errors at all but none matched our specific checks, still show a generic toast
- This guarantees a red toast always appears when validation fails

```typescript
const handleFormError = (errors: any) => {
  const messages: string[] = [];
  if (errors.service_areas || errors.service_areas?.root) {
    messages.push("At least one service area is required (General tab)");
  }
  if (errors.first_name) messages.push("First name is required (General tab)");
  if (errors.last_name) messages.push("Last name is required (General tab)");
  if (errors.email) messages.push("Valid email is required (General tab)");
  
  toast({
    title: "Missing Required Fields",
    description: messages.length > 0 
      ? messages.join(". ") 
      : "Please check all required fields on the General tab.",
    variant: "destructive",
  });
};
```

This is a single function change in one file. The toast will always fire on validation failure.

