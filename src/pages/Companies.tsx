
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { CompaniesTable } from "@/components/companies/CompaniesTable";
import { AddCompanyDialog } from "@/components/companies/AddCompanyDialog";

export default function Companies() {
  const [addCompanyOpen, setAddCompanyOpen] = useState(false);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <DashboardHeader />
          
          <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Company Management</h2>
                <p className="text-gray-600">Manage your subcontractors, vendors, municipalities, and consultants</p>
              </div>
              <Button onClick={() => setAddCompanyOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Company
              </Button>
            </div>

            <CompaniesTable />
          </div>

          <AddCompanyDialog 
            open={addCompanyOpen} 
            onOpenChange={setAddCompanyOpen} 
          />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
