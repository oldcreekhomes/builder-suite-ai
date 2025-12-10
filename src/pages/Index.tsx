import { useState, useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { CompanyDashboardHeader } from "@/components/CompanyDashboardHeader";
import { ProjectsOverview } from "@/components/ProjectsOverview";
import { RecentPhotos } from "@/components/RecentPhotos";
import { WeatherForecast } from "@/components/WeatherForecast";
import { ProjectWarnings } from "@/components/ProjectWarnings";
import { ActiveJobsTable } from "@/components/owner-dashboard/ActiveJobsTable";
import { useProjects } from "@/hooks/useProjects";
import { useDashboardPermissions } from "@/hooks/useDashboardPermissions";

type DashboardView = "project-manager" | "owner";

export default function Index() {
  const { data: projects = [] } = useProjects();
  const primaryProjectAddress = projects[0]?.address || "Alexandria, VA";
  const { canAccessPMDashboard, canAccessOwnerDashboard, defaultDashboard, isLoading } = useDashboardPermissions();

  const [dashboardView, setDashboardView] = useState<DashboardView>(() => {
    const saved = localStorage.getItem('dashboard-view');
    return (saved as DashboardView) || 'project-manager';
  });

  // Ensure user can access current view, redirect to allowed dashboard if not
  useEffect(() => {
    if (isLoading) return;
    
    if (dashboardView === "project-manager" && !canAccessPMDashboard) {
      setDashboardView(canAccessOwnerDashboard ? "owner" : "project-manager");
    } else if (dashboardView === "owner" && !canAccessOwnerDashboard) {
      setDashboardView(canAccessPMDashboard ? "project-manager" : "owner");
    }
  }, [dashboardView, canAccessPMDashboard, canAccessOwnerDashboard, isLoading]);

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
            canAccessPMDashboard={canAccessPMDashboard}
            canAccessOwnerDashboard={canAccessOwnerDashboard}
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
