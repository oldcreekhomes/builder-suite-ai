import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Card } from "@/components/ui/card";
import { 
  Image,
  ChevronRight,
} from "lucide-react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { useProjects } from "@/hooks/useProjects";
import { useProjectPhotos } from "@/hooks/useProjectPhotos";
import { PhotoViewer } from "@/components/photos/PhotoViewer";
import { WeatherForecast } from "@/components/WeatherForecast";
import { ProjectAccountingAlerts } from "@/components/project-dashboard/ProjectAccountingAlerts";

export default function ProjectDashboard() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { data: photos = [], refetch } = useProjectPhotos(projectId || '');
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);

  // Get current project
  const currentProject = projects.find(p => p.id === projectId);
  
  // Get more recent photos for the wider layout (already ordered by uploaded_at desc)
  const recentPhotos = photos.slice(0, 12);

  const handlePhotosClick = () => {
    if (photos.length > 0) {
      setSelectedPhoto(photos[0]);
      setShowPhotoViewer(true);
    }
  };

  const handlePhotoDeleted = () => {
    refetch();
  };

  if (!projectId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Project not found</p>
      </div>
    );
  }

  if (projectsLoading || !currentProject) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading project...</p>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <DashboardHeader projectId={projectId} />

          <div className="flex-1 px-6 pt-3 pb-6 space-y-6">
            {/* Top Row: Accounting Alerts (left) and Project Photos (right) */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Accounting Alerts */}
              <ProjectAccountingAlerts 
                projectId={projectId} 
                projectAddress={currentProject.address} 
              />

              {/* Project Photos */}
              <Card 
                className="p-6 hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={handlePhotosClick}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="bg-gray-100 p-2 rounded-lg">
                        <Image className="h-5 w-5 text-gray-700" />
                      </div>
                      <h3 className="text-lg font-semibold text-black">Project Photos</h3>
                    </div>
                    <p className="text-gray-600 text-sm mb-4">{photos.length} photos uploaded</p>
                    <div className="mt-4">
                      {recentPhotos.length > 0 ? (
                        <div className="grid grid-cols-6 gap-2">
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
                      {photos.length > 12 && (
                        <p className="text-xs text-gray-400 mt-2">
                          +{photos.length - 12} more photos
                        </p>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                </div>
              </Card>
            </div>

            {/* Weather Forecast Section */}
            <div>
              <WeatherForecast address={currentProject.address} />
            </div>
          </div>
        </SidebarInset>

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
