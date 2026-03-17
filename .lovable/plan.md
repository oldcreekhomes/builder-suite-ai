

## Standardize All Lock Icons to Red

**Problem**: Lock icons across the app use inconsistent colors — amber, muted-foreground, no explicit color, destructive, and red. The user wants every Lock icon to be **red** (`text-red-600`), matching the style visible in the screenshot.

**Scope**: 10 files contain `<Lock` usages that need color standardization. Some already use red; those are left as-is.

### Files and Changes

1. **`src/components/accounting/AccountDetailDialog.tsx`**
   - Line ~1264: `text-amber-600` → `text-red-600`

2. **`src/components/reports/JobCostActualDialog.tsx`**
   - Line ~432: `text-amber-600` → `text-red-600`

3. **`src/components/transactions/MakeDepositsContent.tsx`**
   - Line ~787: `text-amber-600` → `text-red-600`
   - Line ~1190: Add `text-red-600` (currently no color, inherits amber from parent)

4. **`src/components/transactions/CreditCardsContent.tsx`**
   - Line ~498: `text-amber-600` → `text-red-600`
   - Line ~945: Add `text-red-600` (no explicit color)

5. **`src/components/transactions/WriteChecksContent.tsx`**
   - Line ~991: `text-amber-600` → `text-red-600`

6. **`src/components/journal/JournalEntryForm.tsx`**
   - Line ~518: `text-amber-600` → `text-red-600`
   - Line ~952: Add `text-red-600` (no explicit color)

7. **`src/components/transactions/ReconcileAccountsContent.tsx`**
   - Line ~1686: Add `text-red-600` (no explicit color)

8. **`src/components/marketplace/UpgradeMarketplaceModal.tsx`**
   - Line ~61: `text-muted-foreground` → `text-red-600`

9. **`src/pages/Accounting.tsx`**
   - Line ~403: `text-muted-foreground` → `text-red-600`

10. **`src/components/accounting/CloseBooksPeriodManager.tsx`**
    - Line ~78: Add `text-red-600` (no color)
    - Line ~128: Add `text-red-600` (no color)

**Already correct** (no changes needed):
- `src/pages/ProjectBudget.tsx` — already `text-red-600`
- `src/components/reports/JobCostsContent.tsx` — already `text-destructive` (which is red)

**Not changed**: `LockOpen` icons (used for unlock/in-progress states) retain their current colors since they represent a different semantic meaning.

### Summary
~15 individual `<Lock` color changes across 10 files. All Lock icons will render as `text-red-600`.

