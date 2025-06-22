
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { EmployeeTable } from "@/components/employees/EmployeeTable";
import { AddEmployeeDialog } from "@/components/employees/AddEmployeeDialog";

export default function Employees() {
  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <DashboardHeader 
            title="Employee Management" 
            subtitle="Manage your team members and invite new employees"
          />
          
          <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Employees</h2>
                <p className="text-gray-600">Manage your team and send invitations</p>
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
