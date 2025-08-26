
import { useParams } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { useToast } from "@/hooks/use-toast";
import { DashboardHeader } from "@/components/DashboardHeader";
import { PhotoUploadDropzone } from "@/components/photos/PhotoUploadDropzone";
import { PhotoGrid } from "@/components/photos/PhotoGrid";
import { PhotoViewer } from "@/components/photos/PhotoViewer";
import { useInfiniteProjectPhotos } from "@/hooks/useInfiniteProjectPhotos";
import { useHeicConverter } from "@/hooks/useHeicConverter";
import { useFloatingChat } from "@/components/chat/FloatingChatManager";

export default function ProjectPhotos() {
  const { projectId } = useParams();
  const { toast } = useToast();
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
  const [showViewer, setShowViewer] = useState(false);
  const { openFloatingChat } = useFloatingChat();

  const { 
    data, 
    isLoading, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage,
    refetch 
  } = useInfiniteProjectPhotos(projectId || '');
  
  const photos = data?.pages.flat() || [];
  const { isConverting } = useHeicConverter(photos, refetch);

  // Intersection observer for infinite scroll
  const loadMoreRef = useCallback((node: HTMLDivElement | null) => {
    if (isLoading || isFetchingNextPage || !hasNextPage) return;
    
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        fetchNextPage();
      }
    }, { threshold: 0.1 });
    
    if (node) observer.observe(node);
    return () => observer.disconnect();
  }, [isLoading, isFetchingNextPage, hasNextPage, fetchNextPage]);

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
        <AppSidebar onStartChat={openFloatingChat} />
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

            {isLoading && photos.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                <p className="ml-3 text-sm text-muted-foreground">Loading photos...</p>
              </div>
            ) : (
              <>
                <PhotoGrid
                  photos={photos}
                  onPhotoSelect={handlePhotoSelect}
                  onRefresh={refetch}
                />
                
                {/* Load more trigger */}
                {hasNextPage && (
                  <div ref={loadMoreRef} className="flex items-center justify-center py-8">
                    {isFetchingNextPage ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black"></div>
                        <p className="text-sm text-muted-foreground">Loading more photos...</p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Scroll to load more photos</p>
                    )}
                  </div>
                )}
                
                {isConverting && (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black"></div>
                    <p className="ml-3 text-sm text-muted-foreground">Converting HEIC photos...</p>
                  </div>
                )}
              </>
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
