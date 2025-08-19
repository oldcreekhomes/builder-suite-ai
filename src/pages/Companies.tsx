
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { CompaniesTable } from "@/components/companies/CompaniesTable";
import { AddCompanyDialog } from "@/components/companies/AddCompanyDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RepresentativesTable } from "@/components/representatives/RepresentativesTable";
import { AddRepresentativeModal } from "@/components/representatives/AddRepresentativeModal";
import { MarketplaceCompaniesTable } from "@/components/marketplace/MarketplaceCompaniesTable";
import { MarketplaceRepresentativesTable } from "@/components/marketplace/MarketplaceRepresentativesTable";
import { AddMarketplaceCompanyDialog } from "@/components/marketplace/AddMarketplaceCompanyDialog";
import { AddMarketplaceRepresentativeDialog } from "@/components/marketplace/AddMarketplaceRepresentativeDialog";
import { BulkAddressFinder } from "@/components/companies/BulkAddressFinder";

export default function Companies() {
  const [addCompanyOpen, setAddCompanyOpen] = useState(false);
  const [addRepresentativeOpen, setAddRepresentativeOpen] = useState(false);
  const [addMarketplaceCompanyOpen, setAddMarketplaceCompanyOpen] = useState(false);
  const [addMarketplaceRepresentativeOpen, setAddMarketplaceRepresentativeOpen] = useState(false);
  const [companySearchQuery, setCompanySearchQuery] = useState("");
  const [representativeSearchQuery, setRepresentativeSearchQuery] = useState("");

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <DashboardHeader />
          
          <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Companies & Representatives</h2>
              </div>
            </div>

            <Tabs defaultValue="companies" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="companies">Companies</TabsTrigger>
                <TabsTrigger value="representatives">Representatives</TabsTrigger>
                <TabsTrigger value="address-finder">Address Finder</TabsTrigger>
                <TabsTrigger value="marketplace-companies">Marketplace Companies</TabsTrigger>
                <TabsTrigger value="marketplace-representatives">Marketplace Reps</TabsTrigger>
              </TabsList>
              
              <TabsContent value="companies" className="space-y-4">
                <div className="flex justify-between items-center gap-4">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search companies..."
                      value={companySearchQuery}
                      onChange={(e) => setCompanySearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Button onClick={() => setAddCompanyOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Company
                  </Button>
                </div>
                <CompaniesTable searchQuery={companySearchQuery} />
              </TabsContent>
              
              <TabsContent value="representatives" className="space-y-4">
                <div className="flex justify-between items-center gap-4">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search representatives..."
                      value={representativeSearchQuery}
                      onChange={(e) => setRepresentativeSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Button onClick={() => setAddRepresentativeOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Representative
                  </Button>
                </div>
                <RepresentativesTable searchQuery={representativeSearchQuery} />
              </TabsContent>
              
              <TabsContent value="address-finder" className="space-y-4">
                <BulkAddressFinder />
              </TabsContent>
              
              <TabsContent value="marketplace-companies" className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold">Marketplace Companies</h3>
                    <p className="text-sm text-gray-600">Browse companies available in the marketplace</p>
                  </div>
                  <Button onClick={() => setAddMarketplaceCompanyOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Company
                  </Button>
                </div>
                <MarketplaceCompaniesTable />
              </TabsContent>
              
              <TabsContent value="marketplace-representatives" className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold">Marketplace Representatives</h3>
                    <p className="text-sm text-gray-600">Browse representatives from marketplace companies</p>
                  </div>
                  <Button onClick={() => setAddMarketplaceRepresentativeOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Representative
                  </Button>
                </div>
                <MarketplaceRepresentativesTable />
              </TabsContent>
            </Tabs>
          </div>

          <AddCompanyDialog 
            open={addCompanyOpen} 
            onOpenChange={setAddCompanyOpen} 
          />
          
          <AddRepresentativeModal 
            open={addRepresentativeOpen} 
            onOpenChange={setAddRepresentativeOpen} 
          />

          <AddMarketplaceCompanyDialog 
            open={addMarketplaceCompanyOpen} 
            onOpenChange={setAddMarketplaceCompanyOpen} 
          />

          <AddMarketplaceRepresentativeDialog 
            open={addMarketplaceRepresentativeOpen} 
            onOpenChange={setAddMarketplaceRepresentativeOpen} 
          />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
