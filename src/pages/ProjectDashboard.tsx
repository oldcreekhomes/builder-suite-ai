import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Image,
  ChevronRight,
  Building2,
  MoreHorizontal
} from "lucide-react";
import { EditProjectDialog } from "@/components/EditProjectDialog";
import { DashboardHeader } from "@/components/DashboardHeader";
import { useProjects } from "@/hooks/useProjects";
import { useProjectPhotos } from "@/hooks/useProjectPhotos";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { preferences } = useNotificationPreferences();
  const canEditProjects = preferences?.can_edit_projects ?? false;
  // Get current project
  const currentProject = projects.find(p => p.id === projectId);
  
  // Debug logging
  console.log('ProjectDashboard Debug:', {
    projectId,
    projectsCount: projects.length,
    projectsLoading,
    currentProject: currentProject ? 'found' : 'not found',
    projectIds: projects.map(p => p.id)
  });
  
  // Get more recent photos for the wider layout (already ordered by uploaded_at desc)
  const recentPhotos = photos.slice(0, 12);

  const handlePhotosClick = () => {
    if (photos.length > 0) {
      setSelectedPhoto(photos[0]); // Start with the most recent photo
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

  // Show loading while projects are being fetched
  if (projectsLoading || !currentProject) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading project...</p>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <header className="bg-white border-b border-border px-6 py-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Building2 className="h-6 w-6 text-muted-foreground" />
                <div>
                  <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    {currentProject.address}
                    {canEditProjects && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditDialogOpen(true);
                        }}
                        className="h-7 w-7"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    )}
                  </h1>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  currentProject.status === 'Under Construction' ? 'bg-orange-100 text-orange-800' :
                  currentProject.status === 'Completed' ? 'bg-green-100 text-green-800' :
                  currentProject.status === 'In Design' ? 'bg-blue-100 text-blue-800' :
                  currentProject.status === 'Permitting' ? 'bg-blue-100 text-blue-800' :
                  currentProject.status === 'Permanently Closed' ? 'bg-gray-100 text-gray-600' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {currentProject.status}
                </span>
              </div>
            </div>
          </header>

          
          <div className="flex-1 p-6">
            {/* Top Row: Accounting Alerts (left) and Project Photos (right) */}
            <div className="grid gap-6 md:grid-cols-2 mb-8">
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

            {/* Weather Forecast Section - Full Width at Bottom */}
            <div className="mb-8">
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

        {currentProject && (
          <EditProjectDialog
            project={currentProject}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
          />
        )}
      </div>
    </SidebarProvider>
  );
}
