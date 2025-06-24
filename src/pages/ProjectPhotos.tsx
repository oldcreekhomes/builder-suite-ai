import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search, Grid, List } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { PhotoUploadDropzone } from "@/components/photos/PhotoUploadDropzone";
import { PhotoGrid } from "@/components/photos/PhotoGrid";
import { PhotoViewer } from "@/components/photos/PhotoViewer";
import { useProjectPhotos } from "@/hooks/useProjectPhotos";

export default function ProjectPhotos() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
  const [showViewer, setShowViewer] = useState(false);

  const { data: photos = [], isLoading, refetch } = useProjectPhotos(projectId || '');

  const filteredPhotos = photos.filter(photo => 
    photo.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    photo.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      <div className="min-h-screen flex w-full bg-gray-50">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <header className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <SidebarTrigger className="text-gray-600 hover:text-black" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/project/${projectId}`)}
                  className="text-gray-600 hover:text-black"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Project
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-black">Project Photos</h1>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Search className="h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search photos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-64"
                  />
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 p-6 space-y-6">
            <PhotoUploadDropzone
              projectId={projectId}
              onUploadSuccess={handleUploadSuccess}
            />

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
              </div>
            ) : (
              <PhotoGrid
                photos={filteredPhotos}
                onPhotoSelect={handlePhotoSelect}
                onRefresh={refetch}
              />
            )}
          </div>
        </main>

        {showViewer && selectedPhoto && (
          <PhotoViewer
            photos={filteredPhotos}
            currentPhoto={selectedPhoto}
            isOpen={showViewer}
            onClose={() => setShowViewer(false)}
            onPhotoDeleted={handlePhotoDeleted}
          />
        )}
      </div>
    </SidebarProvider>
  );
}
