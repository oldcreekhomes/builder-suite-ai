import { useParams } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { CompanyDashboardHeader } from "@/components/CompanyDashboardHeader";
import { DashboardHeader } from "@/components/DashboardHeader";
import { ReportsTabs } from "@/components/reports/ReportsTabs";

export default function Reports() {
  const { projectId } = useParams<{ projectId: string }>();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          {projectId ? (
            <DashboardHeader 
              title="Reports" 
              projectId={projectId}
            />
          ) : (
            <CompanyDashboardHeader />
          )}
          <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <ReportsTabs projectId={projectId} />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
