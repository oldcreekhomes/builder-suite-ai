

## Remove Marketplace and Marketplace Representatives Tabs from Settings

### Data Status

The 4 marketplace representatives (Hector Diaz, Herschey Liss, Larry Perry, Sarah Vega) and their companies (Curated Real Estate Capital, Max Benjamin Partners, Tango Capital, CoreVest Finance) already exist in the main `marketplace_companies` and `marketplace_company_representatives` database tables. No data migration is needed -- they are already discoverable in the Marketplace feature.

### Changes

**1. `src/components/settings/CompaniesTab.tsx`**

- Remove the "Marketplace" and "Marketplace Representatives" `TabsTrigger` entries (change from 4-column grid to 2-column)
- Remove the two `TabsContent` blocks for `marketplace-companies` and `marketplace-representatives`
- Remove the state variables: `addMarketplaceCompanyOpen`, `addMarketplaceRepresentativeOpen`
- Remove the dialog components: `AddMarketplaceCompanyDialog`, `AddMarketplaceRepresentativeDialog`
- Remove unused imports: `MarketplaceCompaniesTable`, `MarketplaceRepresentativesTable`, `AddMarketplaceCompanyDialog`, `AddMarketplaceRepresentativeDialog`
- Update the subtitle from "Manage your companies, representatives, and marketplace connections" to "Manage your companies and representatives"

### Result

The Companies tab in Settings will show only two horizontal sub-tabs: **Companies** and **Representatives**. The Marketplace data remains intact in the database for the paid Marketplace feature.
