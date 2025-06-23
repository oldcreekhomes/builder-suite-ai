
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { CompaniesTable } from "@/components/companies/CompaniesTable";
import { AddCompanyDialog } from "@/components/companies/AddCompanyDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RepresentativesTable } from "@/components/representatives/RepresentativesTable";
import { AddRepresentativeModal } from "@/components/representatives/AddRepresentativeModal";

export default function Companies() {
  const [addCompanyOpen, setAddCompanyOpen] = useState(false);
  const [addRepresentativeOpen, setAddRepresentativeOpen] = useState(false);

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
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="companies">Companies</TabsTrigger>
                <TabsTrigger value="representatives">Representatives</TabsTrigger>
              </TabsList>
              
              <TabsContent value="companies" className="space-y-4">
                <div className="flex justify-end">
                  <Button onClick={() => setAddCompanyOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Company
                  </Button>
                </div>
                <CompaniesTable />
              </TabsContent>
              
              <TabsContent value="representatives" className="space-y-4">
                <div className="flex justify-end">
                  <Button onClick={() => setAddRepresentativeOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Representative
                  </Button>
                </div>
                <RepresentativesTable />
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
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
