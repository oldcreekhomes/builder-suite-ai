
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { ProjectsOverview } from "@/components/ProjectsOverview";
import { WeatherForecast } from "@/components/WeatherForecast";
import { RecentPhotos } from "@/components/RecentPhotos";
import { User } from "@/hooks/useCompanyUsers";
import { useFloatingChat } from "@/components/chat/FloatingChatManager";


const Index = () => {
  const { openFloatingChat } = useFloatingChat();

  const handleUserSelect = (user: User) => {
    // Open floating chat instead of navigating
    openFloatingChat(user);
  };

  const handleStartChat = (user: User) => {
    // Open floating chat instead of navigating
    openFloatingChat(user);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50">
        <AppSidebar 
          onUserSelect={handleUserSelect}
          onStartChat={handleStartChat}
        />
        <main className="flex-1 flex flex-col">
          <DashboardHeader />
          <div className="flex-1 p-6 space-y-6">
            <div className="flex flex-col lg:flex-row gap-6 lg:items-stretch">
              <div className="lg:w-1/2">
                <ProjectsOverview />
              </div>
              <div className="lg:w-1/2 flex">
                <RecentPhotos />
              </div>
            </div>
            
            <div>
              <WeatherForecast address="22314" />
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Index;
