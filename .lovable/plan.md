

## Fix: Slow Search Input on Bidding Page

### Root Cause

The search input is inside a `React.useEffect` (line 238-286) that calls `onHeaderActionChange(...)` to render the toolbar into the parent header. The effect's dependency array includes `searchQuery`:

```js
}, [onHeaderActionChange, status, searchQuery, biddingItems.length, ...]);
```

Every keystroke updates `searchQuery` → triggers the effect → calls `onHeaderActionChange` with a brand new JSX tree → parent re-renders → this component re-renders → the input is **unmounted and remounted** on every keystroke. This causes extreme lag and potentially loses cursor position.

### Fix

**File: `src/components/bidding/BiddingTable.tsx`**

1. **Remove `searchQuery` from the `useEffect` dependency array** — the search input doesn't need to re-emit the entire toolbar on every keystroke since it's a controlled input that re-renders naturally.

2. **Use a ref to keep the search value current inside the effect's JSX** — replace the inline `value={searchQuery}` / `onChange` pattern inside the effect with a small uncontrolled search component that syncs back to the parent via callback. Or simpler: extract the search `<Input>` into a tiny `SearchInput` component that manages its own local state and debounces updates to the parent `setSearchQuery`.

**Concrete approach — local search component:**

Create a small inline component (or extract to a file) like:
```tsx
function DebouncedSearchInput({ onSearch }: { onSearch: (q: string) => void }) {
  const [local, setLocal] = useState("");
  useEffect(() => {
    const t = setTimeout(() => onSearch(local), 200);
    return () => clearTimeout(t);
  }, [local, onSearch]);
  return (
    <div className="relative w-64">
      <Search className="absolute left-3 top-1/2 ..." />
      <Input value={local} onChange={e => setLocal(e.target.value)} ... />
    </div>
  );
}
```

Then inside the `useEffect`, render `<DebouncedSearchInput onSearch={setSearchQuery} />` instead of the raw `<Input>`. Since `setSearchQuery` is a stable React setter, the effect won't re-fire on every keystroke.

Remove `searchQuery` from the dependency array since the search component manages its own state internally.

This fixes all 4 places the search input appears in the effect (draft toolbar, sent/closed toolbar, and the two fallback `toolbarInContent` variants).

### Result
- Typing in the search bar will be instant — no re-mounting on every keystroke
- Filtering applies after a 200ms debounce, which also improves performance for large lists
- No behavior changes otherwise

### Files Changed
- `src/components/bidding/BiddingTable.tsx`

