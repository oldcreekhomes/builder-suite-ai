import { useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Search, Store } from "lucide-react";
import { MarketplaceCompaniesTable } from "@/components/marketplace/MarketplaceCompaniesTable";
import { MarketplaceCategorySidebar } from "@/components/marketplace/MarketplaceCategorySidebar";

export default function Marketplace() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);

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
            />
          </div>
        </div>
      </SidebarInset>
    </div>
  );
}
