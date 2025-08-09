import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { ProjectsOverview } from "@/components/ProjectsOverview";
import { RecentActivity } from "@/components/RecentActivity";
import { QuickStats } from "@/components/QuickStats";
import { RecentPhotos } from "@/components/RecentPhotos";
import { WeatherForecast } from "@/components/WeatherForecast";
import { useProjects } from "@/hooks/useProjects";

export default function Index() {
  const { data: projects = [] } = useProjects();
  const primaryProjectAddress = projects[0]?.address || "Alexandria, VA";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1">
          <div className="flex h-full">
            <SidebarInset className="flex-1">
              <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
                <div className="flex items-center gap-2 px-4">
                  <SidebarTrigger className="-ml-1" />
                </div>
              </header>
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
        </main>
      </div>
    </SidebarProvider>
  );
}