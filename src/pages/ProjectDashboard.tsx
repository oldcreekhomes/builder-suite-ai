import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  DollarSign, 
  FileText, 
  Users, 
  Image,
  Plus,
  ChevronRight,
  Building2,
  ArrowLeft
} from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { useProjectPhotos } from "@/hooks/useProjectPhotos";
import { PhotoViewer } from "@/components/photos/PhotoViewer";
import { formatDistanceToNow } from "date-fns";
import { WeatherForecast } from "@/components/WeatherForecast";

export default function ProjectDashboard() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { data: projects = [] } = useProjects();
  const { data: photos = [], refetch } = useProjectPhotos(projectId || '');
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
  
  // Get current project
  const currentProject = projects.find(p => p.id === projectId);
  
  // Get most recent photos (already ordered by uploaded_at desc)
  const recentPhotos = photos.slice(0, 6);

  const handlePhotosClick = () => {
    if (photos.length > 0) {
      setSelectedPhoto(photos[0]); // Start with the most recent photo
      setShowPhotoViewer(true);
    }
  };

  const handlePhotoDeleted = () => {
    refetch();
  };

  if (!projectId || !currentProject) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Project not found</p>
      </div>
    );
  }

  const dashboardCards = [
    {
      title: "Project Photos",
      description: `${photos.length} photos uploaded`,
      icon: Image,
      onClick: handlePhotosClick,
      content: (
        <div className="mt-4">
          {recentPhotos.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {recentPhotos.map((photo) => (
                <div key={photo.id} className="aspect-square rounded-md overflow-hidden bg-gray-100">
                  <img
                    src={photo.url}
                    alt={photo.description || 'Project photo'}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No photos yet</p>
          )}
          {photos.length > 6 && (
            <p className="text-xs text-gray-400 mt-2">
              +{photos.length - 6} more photos
            </p>
          )}
        </div>
      )
    },
    {
      title: "Documents",
      description: "Files and documentation",
      icon: FileText,
      onClick: () => navigate(`/project/${projectId}/files`),
    },
    {
      title: "Budget",
      description: "Project budget and costs",
      icon: DollarSign,
      onClick: () => navigate(`/project/${projectId}/budget`),
    },
    {
      title: "Schedules",
      description: "Timeline and milestones",
      icon: Calendar,
      onClick: () => navigate(`/project/${projectId}/schedules`),
    },
    {
      title: "Companies",
      description: "Contractors and vendors",
      icon: Users,
      onClick: () => navigate(`/project/${projectId}/companies`),
    },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <header className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <SidebarTrigger className="text-gray-600 hover:text-black h-8 w-8 flex items-center justify-center">
                  <ArrowLeft className="h-4 w-4" />
                </SidebarTrigger>
                <div className="flex items-center space-x-2">
                  <Building2 className="h-6 w-6 text-gray-600" />
                  <div>
                    <h1 className="text-2xl font-bold text-black">{currentProject.address}</h1>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  currentProject.status === 'Under Construction' ? 'bg-orange-100 text-orange-800' :
                  currentProject.status === 'Completed' ? 'bg-green-100 text-green-800' :
                  currentProject.status === 'In Design' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {currentProject.status}
                </span>
              </div>
            </div>
          </header>

          
          <div className="flex-1 p-6">
            {/* Weather Forecast Section */}
            <div className="mb-8">
              <WeatherForecast address={currentProject.address} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dashboardCards.map((card, index) => (
                <Card 
                  key={index} 
                  className="p-6 hover:shadow-lg transition-shadow cursor-pointer group"
                  onClick={card.onClick}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="bg-gray-100 p-2 rounded-lg">
                          <card.icon className="h-5 w-5 text-gray-700" />
                        </div>
                        <h3 className="text-lg font-semibold text-black">{card.title}</h3>
                      </div>
                      <p className="text-gray-600 text-sm mb-4">{card.description}</p>
                      {card.content}
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </main>

        {showPhotoViewer && selectedPhoto && (
          <PhotoViewer
            photos={photos}
            currentPhoto={selectedPhoto}
            isOpen={showPhotoViewer}
            onClose={() => setShowPhotoViewer(false)}
            onPhotoDeleted={handlePhotoDeleted}
          />
        )}
      </div>
    </SidebarProvider>
  );
}
