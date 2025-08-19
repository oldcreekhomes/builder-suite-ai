import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { CompanyDashboardHeader } from "@/components/CompanyDashboardHeader";

export default function EnterBills() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col">
          <CompanyDashboardHeader title="Bills - Enter Bills" />
          <div className="flex-1 p-6 space-y-6">
            <div className="text-center py-12">
              <p className="text-muted-foreground">Enter Bills page content coming soon...</p>
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}