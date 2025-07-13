
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { EmployeeTable } from "@/components/employees/EmployeeTable";
import { AddEmployeeDialog } from "@/components/employees/AddEmployeeDialog";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Card, CardContent } from "@/components/ui/card";

export default function Employees() {
  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false);
  const { profile } = useUserProfile();

  // Check if user is an owner (home builder) vs employee
  const isOwner = profile && profile.role === 'owner';
  
  if (!isOwner) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <SidebarInset className="flex-1">
            <DashboardHeader />
            <div className="p-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Restricted</h2>
                    <p className="text-gray-600">Only home builders can access the Employee Management page.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <DashboardHeader />
          
          <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Employee Management</h2>
              </div>
              <Button onClick={() => setAddEmployeeOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Employee
              </Button>
            </div>

            <EmployeeTable />
          </div>

          <AddEmployeeDialog 
            open={addEmployeeOpen} 
            onOpenChange={setAddEmployeeOpen} 
          />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
