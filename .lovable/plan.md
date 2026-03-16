

## Plan: Move Article 9 to Page 2

Change the split point from Articles 1-8 / 9-15 to Articles 1-9 / 10-15.

### Changes — `src/components/templates/SubcontractorContractForm.tsx`

Update 4 locations where the split filter is applied:

1. **Line 290**: Change `a.num <= 8` → `a.num <= 9`
2. **Line 291**: Change `a.num > 8` → `a.num > 9`
3. **Line 530**: Change `a.num <= 8` → `a.num <= 9`
4. **Line 537**: Change `a.num > 8` → `a.num > 9`

This moves Article 9 (Insurance) onto the end of Page 2, and Page 3 will start with Article 10 (Safety).

