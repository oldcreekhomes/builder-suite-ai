
# Duplicate Company Detection Warning

## Summary
Add real-time duplicate detection when creating a new company. As the user types a company name, the system will check for similar existing companies and display a warning with potential matches, allowing the user to either proceed or select an existing company.

## How It Works
When a user types in the company name field, the system will:
1. Wait for a brief pause in typing (debounce of 300ms to avoid excessive queries)
2. Search existing companies for potential matches using:
   - Exact match (case-insensitive)
   - Partial word matching (e.g., "Anchor" matches "Anchor Loans")
   - Common abbreviation handling (e.g., "LP", "LLC", "Inc")
3. Display a yellow warning alert below the company name field showing potential duplicates
4. Allow the user to dismiss the warning and proceed, or recognize they're creating a duplicate

## User Experience

When typing "Anchor Loans":
```
+--------------------------------------------------+
| Company Name *                                   |
| [Anchor Loans_________________________]          |
|                                                  |
| ⚠️ Similar companies already exist:              |
|   • Anchor Loans LP                              |
|   • Anchor Home Loans                            |
| You may be creating a duplicate.                 |
+--------------------------------------------------+
```

The warning will appear only when similar companies are found and will not block form submission - it's informational only.

## Technical Implementation

### Step 1: Create a Custom Hook for Duplicate Detection
Create `src/hooks/useDuplicateCompanyDetection.ts`:
- Accept the company name as input
- Debounce the search (300ms delay)
- Query companies table for similar names
- Return list of potential matches

The matching algorithm will:
1. Normalize names (lowercase, remove common suffixes like LLC, Inc, LP)
2. Check if any existing company name contains the search term
3. Check if the search term contains any existing company name
4. Use word-based matching for partial matches

### Step 2: Create a Warning Component
Create `src/components/companies/DuplicateCompanyWarning.tsx`:
- Display an Alert with yellow/warning styling
- List potential duplicate company names
- Include a helpful message

### Step 3: Integrate into AddCompanyDialog
Modify `src/components/companies/AddCompanyDialog.tsx`:
- Import and use the new hook with `form.watch("company_name")`
- Display the warning component below the company name field
- Warning only shows when there are potential matches

### Step 4: Apply Same Pattern to Marketplace
Modify `src/components/marketplace/AddMarketplaceCompanyDialog.tsx`:
- Add the same duplicate detection for marketplace companies
- Query `marketplace_companies` table instead

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/hooks/useDuplicateCompanyDetection.ts` | Create | Custom hook for fuzzy company name matching |
| `src/components/companies/DuplicateCompanyWarning.tsx` | Create | Reusable warning alert component |
| `src/components/companies/AddCompanyDialog.tsx` | Modify | Add duplicate detection integration |
| `src/components/marketplace/AddMarketplaceCompanyDialog.tsx` | Modify | Add duplicate detection for marketplace |

## Matching Algorithm Details

The similarity check will use the following logic:

```typescript
function findSimilarCompanies(searchName: string, existingCompanies: Company[]): Company[] {
  const normalized = normalizeCompanyName(searchName);
  
  return existingCompanies.filter(company => {
    const existingNormalized = normalizeCompanyName(company.company_name);
    
    // Check if either contains the other
    if (existingNormalized.includes(normalized) || normalized.includes(existingNormalized)) {
      return true;
    }
    
    // Check word overlap (at least 2 matching words)
    const searchWords = normalized.split(' ').filter(w => w.length > 2);
    const existingWords = existingNormalized.split(' ').filter(w => w.length > 2);
    const matchingWords = searchWords.filter(w => existingWords.includes(w));
    
    return matchingWords.length >= 1 && searchWords.length >= 1;
  });
}

function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(llc|inc|corp|ltd|lp|llp|co|company|incorporated)\b/gi, '')
    .replace(/[.,\-']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
```

## Edge Cases Handled
- Empty or very short names (less than 3 characters) won't trigger search
- The current exact-match duplicate check at submission time remains unchanged
- Warning is dismissable and doesn't block form submission
- Debouncing prevents excessive database queries while typing
