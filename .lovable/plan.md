

## Fix Apartment Page Headers to Match Standard Layout

### Problem
All four apartment pages use a custom inline header (smaller `h-12`, with `SidebarTrigger` icon, different font) instead of the standard `DashboardHeader` component used by pages like Files. This causes the header border to be misaligned with the sidebar branding section and the styling to be inconsistent.

### Fix
Replace the custom header markup in all four apartment pages with the standard page structure used by Files and other project pages: `SidebarProvider` + `AppSidebar` + `SidebarInset` + `DashboardHeader` with `projectId`, `title`, and `subtitle` props.

Each page will follow this pattern (using Files as the reference):
```
<SidebarProvider>
  <div className="flex min-h-screen w-full">
    <AppSidebar />
    <SidebarInset className="flex-1">
      <DashboardHeader title="..." subtitle="..." projectId={projectId} />
      <div className="flex-1 px-6 pt-3 pb-6">
        {/* page content */}
      </div>
    </SidebarInset>
  </div>
</SidebarProvider>
```

Since these are project-scoped pages, `projectId` will come from `useParams`.

### Page titles and subtitles
- **Dashboard**: title="Dashboard", subtitle="Apartment investment overview and key metrics."
- **Inputs**: title="Inputs", subtitle="Property, revenue, and loan assumptions."
- **Income Statement**: title="Income Statement", subtitle="Pro forma income statement projections."
- **Amortization Schedule**: title="Amortization Schedule", subtitle="Loan amortization breakdown by year."

### Files changed
- `src/pages/apartments/ApartmentDashboard.tsx`
- `src/pages/apartments/ApartmentInputs.tsx`
- `src/pages/apartments/ApartmentIncomeStatement.tsx`
- `src/pages/apartments/ApartmentAmortizationSchedule.tsx`

