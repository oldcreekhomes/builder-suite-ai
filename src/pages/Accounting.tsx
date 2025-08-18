import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { CompanyDashboardHeader } from "@/components/CompanyDashboardHeader";


export default function Accounting() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col">
          <CompanyDashboardHeader />
          <div className="flex-1 p-6">
            <div className="flex flex-col h-full">
              <div className="mb-6">
                <h1 className="text-2xl font-bold">Accounting</h1>
                <p className="text-muted-foreground">
                  Manage your financial data with spreadsheet-like functionality.
                </p>
              </div>
              <div className="flex-1 border rounded-lg p-6 bg-card">
                <p className="text-muted-foreground">Ready to build your accounting functionality.</p>
              </div>
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}