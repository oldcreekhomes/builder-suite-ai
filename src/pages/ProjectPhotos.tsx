
import { useParams } from "react-router-dom";
import { useState, useRef, useCallback } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { useToast } from "@/hooks/use-toast";
import { DashboardHeader } from "@/components/DashboardHeader";
import { PhotoUploadDropzone, PhotoUploadDropzoneHandle } from "@/components/photos/PhotoUploadDropzone";
import { PhotoGrid } from "@/components/photos/PhotoGrid";
import { PhotoViewer } from "@/components/photos/PhotoViewer";
import { NewFolderModal } from "@/components/files/NewFolderModal";
import { Button } from "@/components/ui/button";
import { Image, FolderOpen, FolderPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

import { useInfiniteProjectPhotos } from "@/hooks/useInfiniteProjectPhotos";
import { useHeicConverter } from "@/hooks/useHeicConverter";

export default function ProjectPhotos() {
  const { projectId } = useParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
  const [showViewer, setShowViewer] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);

  const dropzoneRef = useRef<PhotoUploadDropzoneHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

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

  const loadMoreRef = useCallback((node: HTMLDivElement | null) => {
    if (isLoading || isFetchingNextPage || !hasNextPage) return;
    
    let observer: IntersectionObserver;
    
    const cleanup = () => {
      if (observer) observer.disconnect();
    };
    
    observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) fetchNextPage();
    }, { threshold: 0.1 });
    
    if (node) observer.observe(node);
    return cleanup;
  }, [isLoading, isFetchingNextPage, hasNextPage, fetchNextPage]);

  const handlePhotoSelect = (photo: any) => {
    setSelectedPhoto(photo);
    setShowViewer(true);
  };

  const handleUploadSuccess = () => {
    refetch();
    toast({ title: "Success", description: "Photos uploaded successfully" });
  };

  const handlePhotoDeleted = () => refetch();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) dropzoneRef.current?.dropFiles(files);
    event.target.value = '';
  };

  const handleFolderUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).filter(file => 
      file.type.startsWith('image/') || file.name.toLowerCase().endsWith('.heic')
    );
    if (files.length > 0) dropzoneRef.current?.dropFiles(files);
    event.target.value = '';
  };

  const handleCreateFolder = async (folderName: string) => {
    if (!user || !projectId) return;
    try {
      const placeholderFileName = `${user.id}/${projectId}/photos/${crypto.randomUUID()}_${folderName}/.placeholder`;
      const placeholderFile = new File([''], '.placeholder', { type: 'text/plain' });
      
      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(placeholderFileName, placeholderFile);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('project-files')
        .getPublicUrl(placeholderFileName);

      const { error: dbError } = await supabase
        .from('project_photos')
        .insert({
          project_id: projectId,
          url: publicUrl,
          description: `${folderName}/.placeholder`,
          uploaded_by: user.id,
        });
      if (dbError) throw dbError;

      toast({ title: "Folder Created", description: `Folder "${folderName}" created successfully` });
      refetch();
    } catch (error) {
      console.error('Folder creation error:', error);
      toast({ title: "Error", description: `Failed to create folder "${folderName}"`, variant: "destructive" });
    }
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
            title="Photos" 
            subtitle="View and upload project photos."
            projectId={projectId}
            headerAction={
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Image className="h-4 w-4 mr-2" />
                  Choose Photos
                </Button>
                <Button variant="outline" size="sm" onClick={() => folderInputRef.current?.click()}>
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Choose Folder
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowNewFolderModal(true)}>
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Create Folder
                </Button>
              </div>
            }
          />
          
          <div className="flex-1 px-6 pt-3 pb-6 space-y-6">
            <PhotoUploadDropzone
              ref={dropzoneRef}
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

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.heic,.HEIC"
        onChange={handleFileUpload}
        className="hidden"
      />
      <input
        ref={folderInputRef}
        type="file"
        {...({ webkitdirectory: "" } as any)}
        multiple
        accept="image/*,.heic,.HEIC"
        onChange={handleFolderUpload}
        className="hidden"
      />

      <NewFolderModal
        isOpen={showNewFolderModal}
        onClose={() => setShowNewFolderModal(false)}
        onCreateFolder={handleCreateFolder}
      />
    </SidebarProvider>
  );
}
