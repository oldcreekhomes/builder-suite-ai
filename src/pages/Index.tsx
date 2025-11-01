import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { CompanyDashboardHeader } from "@/components/CompanyDashboardHeader";
import { ProjectsOverview } from "@/components/ProjectsOverview";
import { RecentActivity } from "@/components/RecentActivity";
import { QuickStats } from "@/components/QuickStats";
import { RecentPhotos } from "@/components/RecentPhotos";
import { WeatherForecast } from "@/components/WeatherForecast";
import { ProjectWarnings } from "@/components/ProjectWarnings";
import { FloatingChatManager, useFloatingChat } from "@/components/chat/FloatingChatManager";
import { useProjects } from "@/hooks/useProjects";

export default function Index() {
  const { data: projects = [] } = useProjects();
  const { registerChatManager, openFloatingChat } = useFloatingChat();
  const primaryProjectAddress = projects[0]?.address || "Alexandria, VA";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar onStartChat={openFloatingChat} />
        <SidebarInset className="flex-1">
          <CompanyDashboardHeader />
          <div className="flex flex-1 flex-col gap-6 p-6">
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
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}