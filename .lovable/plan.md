

## Compact Marketplace Message Dialog

Redesign the dialog to reduce vertical spacing and create a tighter, more efficient layout.

### Current Issues
Looking at the screenshot, there's excess vertical space in:
- Form section padding (currently `p-4`)
- Gap between form fields (currently `space-y-4`)
- Message textarea height (currently `min-h-[100px]`)
- Character counter spacing
- Radio button group spacing
- Company info section padding

### Changes

**File: `src/components/marketplace/SendMarketplaceMessageModal.tsx`**

1. **Reduce form container spacing**
   - Change `p-4 space-y-4` to `p-3 space-y-3` for tighter field grouping

2. **Reduce message textarea height**
   - Change `min-h-[100px]` to `min-h-[80px]` 

3. **Tighten individual field spacing**
   - Change `space-y-2` to `space-y-1` for label-to-input gaps

4. **Compact character counters**
   - Move character counts inline or reduce their margin

5. **Reduce radio group spacing**
   - Change `gap-2` to `gap-1` for radio options

6. **Tighten company info section**
   - Change `px-4 py-3` to `px-3 py-2`

7. **Reduce header padding**
   - Change `p-4 pb-3` to `p-3 pb-2`

8. **Remove excess padding on action buttons**
   - Change `pt-2` to `pt-1`

### Result
A more compact dialog that fits better on screen while maintaining all functionality and readability. The overall vertical height will be reduced by approximately 30-40 pixels.

