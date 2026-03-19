

## Fix Historical Dropdown: Strip City from Addresses and Standardize Button Styling

### Two Problems

1. **Addresses not trimmed**: The hook splits on comma, but the stored addresses (e.g. "895 Kentucky Street Arlington") have no comma — the city is space-separated, not comma-separated. The split does nothing.

2. **Inconsistent button styling**: The Historical dropdown has a custom `History` icon with `text-muted-foreground` styling, making it look different from the adjacent outline buttons (Global Settings, Load Bid Packages). All header controls must use identical shadcn/ui defaults.

### Changes

**1. `src/hooks/useHistoricalProjects.ts`** — Fix address parsing

Replace the simple comma-split with a smarter approach: strip known city names or take only the street number + street name. A reliable method is to use a regex that captures the house number and street name but drops the trailing city word(s):

```typescript
// Remove city/state suffix — keep only street number + street name
// "895 Kentucky Street Arlington" → "895 Kentucky Street"  
// "1712 N. Quebec St. Arlington" → "1712 N. Quebec St."
// "415 E Nelson" stays as-is (too short to have city)
const parts = fullAddress.split(',')[0].trim();
// Known city names to strip from the end
const streetAddress = parts.replace(/\s+(Arlington|Dallas|Fort Worth|Plano|Frisco|McKinney|Denton|Irving|Richardson|Garland|Grand Prairie|Mesquite|Carrollton|Lewisville|Allen|Flower Mound|Mansfield|North Richland Hills|Euless|Bedford|Grapevine|Colleyville|Southlake|Keller|Hurst|Burleson|Cedar Hill|DeSoto|Duncanville|Lancaster|Waxahachie|Midlothian|Rockwall|Wylie|Sachse|Rowlett|Murphy|Lucas|Prosper|Celina|Anna|Princeton|Forney|Fate|Heath|Royse City)\s*$/i, '').trim();
```

Actually, a simpler universal approach: split the pre-comma part by spaces, and if there are 4+ words, drop the last word (which is typically the city). This handles most US street addresses without hardcoding city names.

```typescript
const prePart = fullAddress.split(',')[0].trim();
const words = prePart.split(/\s+/);
// If 4+ words, last word is likely the city — drop it
const streetAddress = words.length >= 4 ? words.slice(0, -1).join(' ') : prePart;
```

**2. `src/components/bidding/BiddingTable.tsx`** — Standardize the dropdown trigger

Remove the custom `History` icon from inside the trigger. Use plain shadcn/ui Select defaults — same `h-9` height, no extra icon styling, no `text-muted-foreground`. The dropdown becomes a clean outline select matching the adjacent buttons:

```tsx
<SelectTrigger className="h-9 w-auto">
  <SelectValue placeholder="Historical" />
</SelectTrigger>
```

No custom icon, no extra classes. Pure shadcn default — border, bg-background, text-sm, rounded-md — identical styling to the outline buttons beside it.

### Files modified
- `src/hooks/useHistoricalProjects.ts` — smarter address trimming
- `src/components/bidding/BiddingTable.tsx` — remove custom icon from dropdown trigger

