import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Search, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MarketplaceCompaniesTable } from "@/components/marketplace/MarketplaceCompaniesTable";
import { MarketplaceCategorySidebar } from "@/components/marketplace/MarketplaceCategorySidebar";
import { UpgradeMarketplaceModal } from "@/components/marketplace/UpgradeMarketplaceModal";
import { useMarketplaceSubscription } from "@/hooks/useMarketplaceSubscription";
import { SERVICE_AREA_OPTIONS } from "@/lib/serviceArea";
import { supabase } from "@/integrations/supabase/client";
import { CompanyDashboardHeader } from "@/components/CompanyDashboardHeader";

export default function Marketplace() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  
  // Track counts from the table
  const [tableCounts, setTableCounts] = useState({ filteredCount: 0, totalCount: 0 });

  const { allowedAreas, isLoading: subscriptionLoading } = useMarketplaceSubscription();

  // Per-region supplier counts
  const { data: regionCounts } = useQuery({
    queryKey: ['marketplace-region-counts'],
    queryFn: async () => {
      // Fetch all rows (bypassing 1000-row default limit)
      let allData: { service_areas: string[] | null }[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data } = await supabase
          .from('marketplace_companies')
          .select('service_areas')
          .range(from, from + pageSize - 1);
        if (!data || data.length === 0) break;
        allData = allData.concat(data as any);
        if (data.length < pageSize) break;
        from += pageSize;
      }
      const counts: Record<string, number> = {};
      SERVICE_AREA_OPTIONS.forEach(a => counts[a] = 0);
      allData.forEach(c => {
        ((c.service_areas as string[]) || []).forEach((area: string) => {
          if (counts[area] !== undefined) counts[area]++;
        });
      });
      return counts;
    },
  });

  // Active service area for browsing (default to first allowed area)
  const [activeArea, setActiveArea] = useState<string | null>(null);
  const currentArea = activeArea || (allowedAreas.length > 0 ? allowedAreas[0] : SERVICE_AREA_OPTIONS[0]);

  const handleCountsChange = useCallback((counts: { filteredCount: number; totalCount: number }) => {
    setTableCounts(counts);
  }, []);

  if (subscriptionLoading) {
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
        <CompanyDashboardHeader title="Marketplace" />

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
            <div className="mb-6">
              <h1 className="text-2xl font-bold">Marketplace</h1>
              <p className="text-muted-foreground">
                Discover top-rated contractors, vendors, and service providers in your area.
              </p>
            </div>
            {/* Service Area Bar */}
            <div className="bg-background border rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Browsing:</span>
                  <div className="flex gap-2">
                    {SERVICE_AREA_OPTIONS.map(area => {
                      const isAllowed = allowedAreas.includes(area);
                      const isActive = currentArea === area;
                      return (
                        <Badge
                          key={area}
                          variant={isActive ? "default" : "secondary"}
                          className={`cursor-pointer ${!isAllowed ? 'opacity-50' : ''}`}
                          onClick={() => {
                            if (isAllowed) {
                              setActiveArea(area);
                            } else {
                              setUpgradeModalOpen(true);
                            }
                          }}
                        >
                          {area} ({regionCounts?.[area]?.toLocaleString() ?? '…'})
                          {!isAllowed && " 🔒"}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

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
              activeServiceAreas={[currentArea]}
              onCountsChange={handleCountsChange}
            />
          </div>
        </div>
      </SidebarInset>

      {/* Upgrade Modal */}
      <UpgradeMarketplaceModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
        currentAreas={allowedAreas}
      />
    </div>
  );
}
