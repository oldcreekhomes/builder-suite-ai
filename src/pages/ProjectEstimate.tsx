import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { TakeoffList } from "@/components/estimate/TakeoffList";

export default function ProjectEstimate() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <DashboardHeader 
            title="Estimate & Takeoff"
          />
          <div className="flex-1 p-6">
            <TakeoffList />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
