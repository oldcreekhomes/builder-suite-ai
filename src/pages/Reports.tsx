import { useState, ReactNode } from "react";
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
  const [reportsHeaderActions, setReportsHeaderActions] = useState<ReactNode>(null);

  return (
    <ReportsGuard>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <SidebarInset className="flex-1">
            {projectId ? (
              <DashboardHeader 
                title="Reports" 
                subtitle="Generate and view financial reports."
                projectId={projectId}
                headerAction={reportsHeaderActions}
              />
            ) : (
              <CompanyDashboardHeader />
            )}
            <div className="flex flex-1 overflow-hidden">
              <UniversalFilePreviewProvider>
                <ReportsTabs 
                  projectId={projectId}
                  onHeaderActionChange={setReportsHeaderActions}
                />
              </UniversalFilePreviewProvider>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </ReportsGuard>
  );
}
