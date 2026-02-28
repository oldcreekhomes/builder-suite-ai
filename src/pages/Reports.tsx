import { useParams } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { CompanyDashboardHeader } from "@/components/CompanyDashboardHeader";
import { DashboardHeader } from "@/components/DashboardHeader";
import { ReportsTabs } from "@/components/reports/ReportsTabs";
import { ReportsGuard } from "@/components/guards/ReportsGuard";
import { UniversalFilePreviewProvider } from "@/components/files/UniversalFilePreviewProvider";

export default function Reports() {
  const { projectId } = useParams<{ projectId: string }>();

  return (
    <ReportsGuard>
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
            <div className="flex-1 p-6 space-y-4">
              <div className="mb-6">
                <h1 className="text-2xl font-bold">Reports</h1>
                <p className="text-muted-foreground">Generate and view financial reports.</p>
              </div>
              <UniversalFilePreviewProvider>
                <ReportsTabs projectId={projectId} />
              </UniversalFilePreviewProvider>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </ReportsGuard>
  );
}
