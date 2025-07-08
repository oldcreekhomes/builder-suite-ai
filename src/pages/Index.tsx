
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { ProjectsOverview } from "@/components/ProjectsOverview";
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
            <div>
              <WeatherForecast address="22314" />
            </div>
            
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="lg:flex-grow">
                <ProjectsOverview />
              </div>
              <div className="lg:w-64">
                <RecentPhotos />
              </div>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Index;
