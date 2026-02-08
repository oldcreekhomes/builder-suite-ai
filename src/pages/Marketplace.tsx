import { useState, useCallback } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Search, Store } from "lucide-react";
import { MarketplaceCompaniesTable } from "@/components/marketplace/MarketplaceCompaniesTable";
import { MarketplaceCategorySidebar } from "@/components/marketplace/MarketplaceCategorySidebar";
import { MarketplaceRadiusControl } from "@/components/marketplace/MarketplaceRadiusControl";
import { SetupHQModal } from "@/components/marketplace/SetupHQModal";
import { UpgradeMarketplaceModal } from "@/components/marketplace/UpgradeMarketplaceModal";
import { useCompanyHQ } from "@/hooks/useCompanyHQ";
import { useMarketplaceSubscription, SubscriptionTier } from "@/hooks/useMarketplaceSubscription";

export default function Marketplace() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [currentRadius, setCurrentRadius] = useState(30);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  
  // Track counts from the table
  const [tableCounts, setTableCounts] = useState({ filteredCount: 0, totalCount: 0, excludedCount: 0 });

  const { hqData, hasHQSet, isLoading: hqLoading, updateHQ, isUpdating } = useCompanyHQ();
  const { tier, maxRadius, isLoading: subscriptionLoading } = useMarketplaceSubscription();

  // Show setup HQ modal for new users
  const [setupModalOpen, setSetupModalOpen] = useState(false);

  // Check if we need to show setup modal (no HQ set and not loading)
  const shouldShowSetupModal = !hqLoading && !hasHQSet && !setupModalOpen;

  const handleUpgradeSelect = (selectedTier: SubscriptionTier) => {
    // TODO: Integrate with Stripe checkout
    console.log('Selected tier:', selectedTier);
  };

  const handleRadiusChange = (radius: number) => {
    if (radius <= maxRadius) {
      setCurrentRadius(radius);
    }
  };

  const handleCountsChange = useCallback((counts: { filteredCount: number; totalCount: number; excludedCount: number }) => {
    setTableCounts(counts);
  }, []);

  if (hqLoading || subscriptionLoading) {
    return (
      <div className="min-h-screen flex w-full bg-background items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex w-full bg-background">
      <AppSidebar />
      <SidebarInset className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4 space-y-2 border-b border-border">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <Store className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Marketplace</h1>
          </div>
          <p className="text-muted-foreground">
            Discover top-rated contractors, vendors, and service providers in your area. 
            All companies are vetted with 4+ star ratings.
          </p>
        </div>

        {/* Main content with sidebar */}
        <div className="flex flex-1 overflow-hidden">
          {/* Category Filter Sidebar */}
          <MarketplaceCategorySidebar
            selectedCategory={selectedCategory}
            selectedType={selectedType}
            onCategoryChange={setSelectedCategory}
            onTypeChange={setSelectedType}
          />

          {/* Companies content */}
          <div className="flex-1 p-6 overflow-auto">
            {/* Radius Control - only show if HQ is set */}
            {hasHQSet && (
              <MarketplaceRadiusControl
                hqCity={hqData?.hq_city || null}
                hqState={hqData?.hq_state || null}
                currentRadius={currentRadius}
                maxRadius={maxRadius}
                tier={tier}
                filteredCount={tableCounts.filteredCount}
                totalCount={tableCounts.totalCount}
                onRadiusChange={handleRadiusChange}
                onUpgradeClick={() => setUpgradeModalOpen(true)}
              />
            )}

            {/* Search */}
            <div className="relative max-w-md mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by company name or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Table */}
            <MarketplaceCompaniesTable 
              searchQuery={searchQuery}
              selectedCategory={selectedCategory}
              selectedType={selectedType}
              currentRadius={currentRadius}
              onCountsChange={handleCountsChange}
            />
          </div>
        </div>
      </SidebarInset>

      {/* Setup HQ Modal - shows on first visit */}
      <SetupHQModal
        open={shouldShowSetupModal || setupModalOpen}
        onOpenChange={setSetupModalOpen}
        onSave={(data) => {
          updateHQ(data);
          setSetupModalOpen(false);
        }}
        isLoading={isUpdating}
      />

      {/* Upgrade Modal */}
      <UpgradeMarketplaceModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
        currentTier={tier}
        onSelectTier={handleUpgradeSelect}
      />
    </div>
  );
}
