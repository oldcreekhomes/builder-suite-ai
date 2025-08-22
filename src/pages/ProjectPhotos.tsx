
import { useParams } from "react-router-dom";
import { useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { useToast } from "@/hooks/use-toast";
import { DashboardHeader } from "@/components/DashboardHeader";
import { PhotoUploadDropzone } from "@/components/photos/PhotoUploadDropzone";
import { PhotoGrid } from "@/components/photos/PhotoGrid";
import { PhotoViewer } from "@/components/photos/PhotoViewer";
import { useProjectPhotos } from "@/hooks/useProjectPhotos";
import { useHeicConverter } from "@/hooks/useHeicConverter";

export default function ProjectPhotos() {
  const { projectId } = useParams();
  const { toast } = useToast();
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
  const [showViewer, setShowViewer] = useState(false);

  const { data: photos = [], isLoading, refetch } = useProjectPhotos(projectId || '');
  const { isConverting } = useHeicConverter(photos, refetch);

  const handlePhotoSelect = (photo: any) => {
    setSelectedPhoto(photo);
    setShowViewer(true);
  };

  const handleUploadSuccess = () => {
    refetch();
    toast({
      title: "Success",
      description: "Photos uploaded successfully",
    });
  };

  const handlePhotoDeleted = () => {
    refetch();
  };

  if (!projectId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Invalid project ID</p>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <DashboardHeader 
            title="Project Photos" 
            projectId={projectId}
          />
          
          <div className="flex-1 p-6 space-y-6">
            <PhotoUploadDropzone
              projectId={projectId}
              onUploadSuccess={handleUploadSuccess}
            />

            {isLoading || isConverting ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                {isConverting && (
                  <p className="ml-3 text-sm text-muted-foreground">Converting HEIC photos...</p>
                )}
              </div>
            ) : (
              <PhotoGrid
                photos={photos}
                onPhotoSelect={handlePhotoSelect}
                onRefresh={refetch}
              />
            )}
          </div>
        </SidebarInset>
      </div>

      {showViewer && selectedPhoto && (
        <PhotoViewer
          photos={photos}
          currentPhoto={selectedPhoto}
          isOpen={showViewer}
          onClose={() => setShowViewer(false)}
          onPhotoDeleted={handlePhotoDeleted}
        />
      )}
    </SidebarProvider>
  );
}
