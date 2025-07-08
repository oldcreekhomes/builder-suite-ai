
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { ProjectsOverview } from "@/components/ProjectsOverview";
import { QuickStats } from "@/components/QuickStats";
import { WeatherForecast } from "@/components/WeatherForecast";
import { RecentPhotos } from "@/components/RecentPhotos";

const Index = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <DashboardHeader />
          <div className="flex-1 p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <RecentPhotos />
              <div className="lg:col-span-2">
                <WeatherForecast address="22314" />
              </div>
            </div>
            <QuickStats />
            
            <div className="w-full">
              <ProjectsOverview />
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Index;
