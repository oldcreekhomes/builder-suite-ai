

## Standardize EditDepositDialog to Match EditBillDialog Styling

The Edit Bill dialog is the established standard in the application. Here are the specific differences between the two dialogs and what needs to change:

### Differences Found

| Aspect | Edit Bill (Standard) | Edit Deposit (Current) |
|--------|---------------------|----------------------|
| **Dialog width** | `max-w-6xl` | `max-w-5xl` |
| **Dialog height** | `max-h-[90vh] overflow-y-auto` | `max-h-[85vh] flex flex-col` |
| **Header labels** | Full-size `Label` (default text-sm) | `Label className="text-xs"` |
| **Header field layout** | `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3` with `space-y-2` per field | `grid grid-cols-4` with no spacing |
| **Line items section** | `"Line Items"` heading, wrapped in `border rounded-lg overflow-hidden` container with `bg-muted` header row and `border-t` separators | Bare `div` with loose grid rows, no table container |
| **Tab list** | `grid w-full grid-cols-2` (full-width tabs) | Default narrow `TabsList` |
| **Add Row button** | Above the table, `variant="outline"` with `Plus` icon | Below the table, `variant="ghost"` with tiny text |
| **Delete button** | `variant="destructive"` red button, `h-8 w-8` | `variant="ghost"` subtle icon |
| **Total display** | Inside table footer with `bg-muted border-t` | In `DialogFooter` as text |
| **Footer buttons** | Two `flex-1` buttons (Cancel + Save Changes), same width, inside the content flow | `DialogFooter` with small right-aligned buttons |
| **Cost field** | Has `$` prefix inside input | Plain input |
| **Total column** | Computed total shown per row in a `bg-muted` badge | No per-row total |
| **Input sizes** | `h-8` with no `text-xs` override | `h-8 text-xs` |

### Plan: Restyle EditDepositDialog

**File: `src/components/deposits/EditDepositDialog.tsx`**

1. **Dialog container**: Change to `max-w-6xl max-h-[90vh] overflow-y-auto` (remove flex flex-col)
2. **Header fields**: Use `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4` with `space-y-2` per field, remove `text-xs` from Labels
3. **Tabs**: Use `grid w-full grid-cols-2` on `TabsList`
4. **Line items table**: Wrap in `border rounded-lg overflow-hidden` container with `bg-muted` header row using grid columns, `border-t` row separators, and `p-3` padding (matching Edit Bill structure)
5. **Add line columns**: Add a computed "Total" column per row (qty x cost, displayed in a `bg-muted` bordered badge)
6. **Cost input**: Add `$` prefix like Edit Bill
7. **Add Row button**: Move above the table, use `variant="outline"` with `size="sm"`
8. **Delete button**: Change to `variant="destructive"` with `h-8 w-8 p-0`
9. **Table footer**: Add `bg-muted border-t` row showing the tab total (e.g., "Chart of Accounts Total: $117.33")
10. **Dialog footer**: Replace `DialogFooter` with two full-width `flex-1` buttons (Cancel + Save) matching Edit Bill's pattern
11. **Remove `text-xs`** from all inputs -- use default text-sm to match Edit Bill

### Files Changed
| File | Change |
|------|--------|
| `src/components/deposits/EditDepositDialog.tsx` | Restyle to match Edit Bill dialog patterns |

