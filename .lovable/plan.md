
## Fix Manage Bills Table Alignment and Submit Button Location

### Problem 1: Table Top Border Misaligned
The Manage Bills content area uses `p-6` padding (equal padding on all sides), while every other page in the app uses `px-6 pt-3 pb-6`. The extra top padding (`pt-6` vs `pt-3`) pushes the table border down so it doesn't align with the sidebar's project dropdown -- inconsistent with Files, Budget, Bidding, etc.

### Problem 2: "Submit Selected Bills" Button in Wrong Location
When bills are extracted on the "Enter with AI" tab, a "Submit Selected Bills" button appears inline above the table. Per the header-action bridge pattern, this button should be in the DashboardHeader's action slot alongside the "Upload PDFs" button.

### Changes

**File: `src/components/bills/BillsApprovalTabs.tsx`**

1. **Fix padding** (line 819): Change `p-6` to `px-6 pt-3 pb-6` to match the standard content wrapper padding used across all project pages.

2. **Move "Submit Selected Bills" to header** (lines 790-801 and 840-844):
   - Update the `useEffect` header action emission for the `upload` tab: when `batchBills.length > 0 && selectedBillIds.size > 0`, emit the Submit button alongside the Upload PDFs component in the header action slot.
   - Remove the inline `<div className="flex justify-end">` block containing the Submit button from the content area (lines 840-844).
   - The header action for the upload tab will conditionally render:
     - Always: The `SimplifiedAIBillExtraction` upload button
     - When bills exist: The "Submit Selected Bills (N)" button next to it

### Technical Detail

The `useEffect` for `activeTab === 'upload'` (line 790) will be updated to:

```tsx
} else if (activeTab === 'upload') {
  onHeaderActionChange(
    <div className="flex items-center gap-2">
      <SimplifiedAIBillExtraction
        ref={extractionRef}
        onDataExtracted={() => {}}
        onSwitchToManual={() => setActiveTab("manual")}
        suppressIndividualToasts={true}
        onExtractionStart={(total) => handleExtractionStart()}
        onExtractionComplete={handleExtractionComplete}
        onExtractionProgress={handleExtractionProgress}
      />
      {batchBills.length > 0 && (
        <Button onClick={handleSubmitAllBills} disabled={isSubmitting || selectedBillIds.size === 0} size="sm" className="bg-black hover:bg-gray-800 text-white">
          {isSubmitting ? "Submitting..." : `Submit Selected Bills (${selectedBillIds.size})`}
        </Button>
      )}
    </div>
  );
}
```

The dependency array of the `useEffect` will be updated to include `batchBills.length`, `selectedBillIds.size`, and `isSubmitting` so the header re-renders when these values change.

### Result
- All Manage Bills tabs (Enter Manually, Enter with AI, Review, Rejected, Approved, Paid) will have their table top borders aligned with the project dropdown, matching every other page.
- The "Submit Selected Bills" button moves to the header bar, consistent with the header-action bridge pattern.
