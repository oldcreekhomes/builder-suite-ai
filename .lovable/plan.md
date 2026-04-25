## Goal
Keep the dialog at its current width (`max-w-5xl`) but rebalance the layout so the top row contains only **Company | Bid Package Cost Code | Sending To** evenly spaced, and **Custom Message** moves to the footer row on the left, sharing the row with **Cancel / Send PO** on the right.

## Current state (`src/components/bidding/ConfirmPODialog.tsx`)
- **Top row** (lines 270–316): 12-col grid with col-span 2 / 3 / 3 / 4 → uneven spacing.
- **Footer row** (lines 469–485): `flex justify-end gap-2` containing Cancel + Send PO.

## Proposed changes (one file)

### 1. Top header row — even 3-column split (lines 270–316)
Replace the 12-col grid with a clean `grid-cols-3 gap-6` so Company, Cost Code, and Sending To each get exactly ⅓ of the dialog width and align at the top.

```tsx
<div className="grid grid-cols-3 gap-6 items-start">
  <div>
    <Label …>Company</Label>
    <p …>{biddingCompany.companies.company_name}</p>
  </div>
  <div>
    <Label …>Bid Package Cost Code</Label>
    <p …>{costCodeData ? `${costCodeData.code}: ${costCodeData.name}` : 'Loading...'}</p>
  </div>
  <div>
    <Label …>Sending To</Label>
    {/* recipient name + email — unchanged markup */}
  </div>
</div>
```

The Custom Message block (currently `col-span-4` at lines 303–315) is **removed from this row**.

### 2. Footer row — message left, buttons right (lines 469–485)
Convert the footer from `flex justify-end` into a 2-column flex with the textarea on the left and the action buttons right-aligned & bottom-aligned.

```tsx
<div className="flex items-end gap-4 mt-6">
  <div className="flex-1 min-w-0">
    <Label htmlFor="custom-message" className="text-sm font-medium text-muted-foreground">
      Custom Message (Optional)
    </Label>
    <Textarea
      id="custom-message"
      placeholder="Add a custom message to include in the email..."
      className="w-full mt-1 resize-none focus-visible:ring-offset-0 focus-visible:ring-2 focus-visible:ring-black focus-visible:border-black"
      rows={2}
      value={customMessage}
      onChange={(e) => setCustomMessage(e.target.value)}
    />
  </div>
  <div className="flex gap-2 shrink-0">
    <Button variant="outline" onClick={onClose} disabled={isLoading}
      className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300">
      Cancel
    </Button>
    <Button onClick={handleConfirm} disabled={isLoading || isExtracting}
      className="bg-green-600 hover:bg-green-700 text-white">
      {isLoading ? 'Sending...' : mode === 'resend' ? 'Resend PO' : 'Send PO'}
    </Button>
  </div>
</div>
```

`items-end` ensures the Cancel/Send PO buttons sit flush with the bottom of the textarea, matching the visual baseline the user expects.

## Visual outcome
- **Top:** three equal columns — Company · Cost Code · Sending To — no awkward gaps.
- **Bottom:** Custom Message textarea on the left filling available space, Cancel + Send PO on the right.
- Dialog width unchanged (`max-w-5xl`); only internal layout reshuffled.
- No logic, data, query, or state changes — pure JSX/Tailwind reorganization in `ConfirmPODialog.tsx`.
