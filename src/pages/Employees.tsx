
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, ShieldAlert } from "lucide-react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { EmployeeTable } from "@/components/employees/EmployeeTable";
import { AddEmployeeDialog } from "@/components/employees/AddEmployeeDialog";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useUserRole } from "@/hooks/useUserRole";
import { useEmployeePermissions } from "@/hooks/useEmployeePermissions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function Employees() {
  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false);
  const { profile } = useUserProfile();
  const { isOwner, isAccountant, isLoading: roleLoading } = useUserRole();
  const { canAccessEmployees, isLoading: permissionsLoading } = useEmployeePermissions();

  const isLoading = roleLoading || permissionsLoading;
  const hasAccess = isOwner || isAccountant || canAccessEmployees;

  // Show loading state while checking permissions
  if (isLoading) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <SidebarInset className="flex-1">
            <DashboardHeader />
            <div className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-8 bg-muted rounded w-1/4"></div>
                <div className="h-64 bg-muted rounded"></div>
              </div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  // Show no access message if user doesn't have permission
  if (!hasAccess) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <SidebarInset className="flex-1">
            <DashboardHeader />
            <div className="p-6 flex items-center justify-center min-h-[calc(100vh-4rem)]">
              <Card className="max-w-md">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-destructive" />
                    <CardTitle>Access Denied</CardTitle>
                  </div>
                  <CardDescription>
                    You don't have permission to view the employee directory.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Please contact your administrator if you need access to this page.
                  </p>
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
