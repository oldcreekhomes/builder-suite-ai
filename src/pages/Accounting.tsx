import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { CompanyDashboardHeader } from "@/components/CompanyDashboardHeader";

export default function Accounting() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <CompanyDashboardHeader />
          <div className="flex flex-1 flex-col gap-6 p-6">
            <div className="rounded-xl bg-muted/50 p-6">
              <h1 className="text-2xl font-bold mb-4">Accounting</h1>
              <p className="text-muted-foreground">
                Accounting features and financial management tools will be available here.
              </p>
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}