import { useState, useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { CompanyDashboardHeader } from "@/components/CompanyDashboardHeader";
import { ProjectsOverview } from "@/components/ProjectsOverview";
import { RecentPhotos } from "@/components/RecentPhotos";
import { WeatherForecast } from "@/components/WeatherForecast";
import { ProjectWarnings } from "@/components/ProjectWarnings";
import { DashboardSelector } from "@/components/DashboardSelector";
import { OwnerDashboardSummary } from "@/components/owner-dashboard/OwnerDashboardSummary";
import { ActiveJobsTable } from "@/components/owner-dashboard/ActiveJobsTable";
import { useProjects } from "@/hooks/useProjects";

type DashboardView = "project-manager" | "owner";

export default function Index() {
  const { data: projects = [] } = useProjects();
  const primaryProjectAddress = projects[0]?.address || "Alexandria, VA";

  const [dashboardView, setDashboardView] = useState<DashboardView>(() => {
    const saved = localStorage.getItem('dashboard-view');
    return (saved as DashboardView) || 'project-manager';
  });

  useEffect(() => {
    localStorage.setItem('dashboard-view', dashboardView);
  }, [dashboardView]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <CompanyDashboardHeader 
            dashboardView={dashboardView} 
            onDashboardViewChange={setDashboardView} 
          />
          <div className="flex flex-1 flex-col gap-6 p-6">
            
            {dashboardView === "project-manager" ? (
              <>
                <div className="grid gap-6 md:grid-cols-4">
                  <div className="md:col-span-2">
                    <div className="rounded-xl bg-muted/50 h-full">
                      <ProjectsOverview />
                    </div>
                  </div>
                  <div className="h-full">
                    <ProjectWarnings />
                  </div>
                  <div className="h-full">
                    <div className="rounded-xl bg-muted/50 h-full">
                      <RecentPhotos />
                    </div>
                  </div>
                </div>
                <div className="rounded-xl bg-muted/50">
                  <WeatherForecast address={primaryProjectAddress} />
                </div>
              </>
            ) : (
              <ActiveJobsTable />
            )}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
