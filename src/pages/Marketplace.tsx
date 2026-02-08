import { useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Store } from "lucide-react";
import { MarketplaceCompaniesTable } from "@/components/marketplace/MarketplaceCompaniesTable";
import { COMPANY_TYPE_CATEGORIES } from "@/constants/companyTypeGoogleMapping";

export default function Marketplace() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Get all company types from categories for filtering
  const allCompanyTypes = COMPANY_TYPE_CATEGORIES.flatMap(cat => cat.types);

  return (
    <div className="min-h-screen flex w-full bg-background">
      <AppSidebar />
      <SidebarInset className="flex-1">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Store className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold text-foreground">Marketplace</h1>
            </div>
            <p className="text-muted-foreground">
              Discover top-rated contractors, vendors, and service providers in your area. 
              All companies are vetted with 4+ star ratings.
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by company name or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-[280px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {COMPANY_TYPE_CATEGORIES.map((category) => (
                  <SelectItem key={category.name} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <MarketplaceCompaniesTable 
            searchQuery={searchQuery}
            selectedCategory={selectedCategory}
          />
        </div>
      </SidebarInset>
    </div>
  );
}
