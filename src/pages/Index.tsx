import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { ProjectsOverview } from "@/components/ProjectsOverview";
import { RecentActivity } from "@/components/RecentActivity";
import { QuickStats } from "@/components/QuickStats";
import { RecentPhotos } from "@/components/RecentPhotos";
import { WeatherForecast } from "@/components/WeatherForecast";
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
          <DashboardHeader />
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="md:col-span-2 space-y-4">
                <div className="rounded-xl bg-muted/50">
                  <ProjectsOverview />
                </div>
              </div>
              <div className="space-y-4">
                <div className="rounded-xl bg-muted/50">
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
      <FloatingChatManager onOpenChat={registerChatManager} />
    </SidebarProvider>
  );
}