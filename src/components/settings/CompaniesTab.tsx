import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { CompaniesTable } from "@/components/companies/CompaniesTable";
import { AddCompanyDialog } from "@/components/companies/AddCompanyDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RepresentativesTable } from "@/components/representatives/RepresentativesTable";
import { AddRepresentativeModal } from "@/components/representatives/AddRepresentativeModal";

export function CompaniesTab() {
  const [activeTab, setActiveTab] = useState("companies");
  const [addCompanyOpen, setAddCompanyOpen] = useState(false);
  const [addRepresentativeOpen, setAddRepresentativeOpen] = useState(false);
  const [companySearchQuery, setCompanySearchQuery] = useState("");
  const [representativeSearchQuery, setRepresentativeSearchQuery] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    if (activeTab === "companies") {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    }
  }, [activeTab, queryClient]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Companies & Representatives</h3>
          <p className="text-sm text-muted-foreground">Manage your companies and representatives</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="companies">Companies</TabsTrigger>
          <TabsTrigger value="representatives">Representatives</TabsTrigger>
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
          <CompaniesTable
            key={activeTab === "companies" ? "companies-active" : "companies-hidden"}
            searchQuery={companySearchQuery}
          />
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
      </Tabs>

      <AddCompanyDialog open={addCompanyOpen} onOpenChange={setAddCompanyOpen} />
      <AddRepresentativeModal open={addRepresentativeOpen} onOpenChange={setAddRepresentativeOpen} />
    </div>
  );
}
