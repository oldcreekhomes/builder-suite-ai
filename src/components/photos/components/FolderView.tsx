import { Folder, ChevronRight, ChevronDown, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhotoCard } from "./PhotoCard";
import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Download, Link, Share } from "lucide-react";

interface ProjectPhoto {
  id: string;
  project_id: string;
  url: string;
  description: string | null;
  uploaded_by: string;
  uploaded_at: string;
  uploaded_by_profile?: { email: string };
}

interface FolderViewProps {
  folderPath: string;
  photos: ProjectPhoto[];
  isExpanded: boolean;
  selectedPhotos: Set<string>;
  deletingPhoto: string | null;
  onToggleFolder: (folderPath: string) => void;
  onPhotoSelect: (photo: ProjectPhoto) => void;
  onPhotoSelection: (photoId: string, checked: boolean) => void;
  onDownload: (photo: ProjectPhoto) => void;
  onShare: (photo: ProjectPhoto) => void;
  onDelete: (photo: ProjectPhoto) => void;
  onUploadSuccess: () => void;
  onShareFolder: (folderPath: string, photos: ProjectPhoto[]) => void;
  projectId: string;
}

export function FolderView({
  folderPath,
  photos,
  isExpanded,
  selectedPhotos,
  deletingPhoto,
  onToggleFolder,
  onPhotoSelect,
  onPhotoSelection,
  onDownload,
  onShare,
  onDelete,
  onUploadSuccess,
  onShareFolder,
  projectId
}: FolderViewProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const uploadPhoto = async (file: File, relativePath: string) => {
    if (!user) return false;

    const fileId = crypto.randomUUID();
    const fileName = `${user.id}/${projectId}/photos/${fileId}_${relativePath}`;
    
    try {
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('project-files')
        .getPublicUrl(fileName);

      // Save photo metadata to database
      const { error: dbError } = await supabase
        .from('project_photos')
        .insert({
          project_id: projectId,
          url: publicUrl,
          description: relativePath,
          uploaded_by: user.id,
        });

      if (dbError) throw dbError;

      return true;
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Error",
        description: `Failed to upload ${file.name}`,
        variant: "destructive",
      });
      return false;
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    console.log('Photos dropped into folder:', folderPath, acceptedFiles);
    
    let successCount = 0;
    
    for (const file of acceptedFiles) {
      // Create the path with the folder structure
      const relativePath = folderPath === 'Root' ? file.name : `${folderPath}/${file.name}`;
      
      const success = await uploadPhoto(file, relativePath);
      if (success) {
        successCount++;
      }
    }

    if (successCount > 0) {
      toast({
        title: "Upload Complete",
        description: `Successfully uploaded ${successCount} photo(s) to ${folderPath === 'Root' ? 'Root Photos' : folderPath}`,
      });
      onUploadSuccess();
    }
  }, [folderPath, projectId, user, toast, onUploadSuccess]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    noClick: true,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg', '.heic', '.HEIC']
    }
  });

  const handleDownloadFolder = async () => {
    // Download all photos in the folder
    for (const photo of photos) {
      try {
        const response = await fetch(photo.url);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = photo.description || `photo-${photo.id}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        // Add small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error('Download error:', error);
      }
    }
    
    toast({
      title: "Download Started",
      description: `Downloading ${photos.length} photo(s) from ${folderPath === 'Root' ? 'Root Photos' : folderPath}`,
    });
  };

  const handleCreateLink = () => {
    onShareFolder(folderPath, photos);
  };

  const handleShareFolder = () => {
    onShareFolder(folderPath, photos);
  };

  return (
    <div className="space-y-4">
      <ContextMenu>
        <ContextMenuTrigger>
          <div 
            {...getRootProps()}
            className={`flex items-center space-x-2 py-2 px-4 bg-gray-50 hover:bg-gray-100 cursor-pointer rounded-lg border-2 border-dashed border-gray-300 transition-colors ${
              isDragActive ? 'bg-blue-50 border-blue-400' : ''
            }`}
          >
            <input {...getInputProps()} />
            <div 
              className="flex items-center space-x-2 flex-1"
              onClick={() => onToggleFolder(folderPath)}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-500" />
              )}
              <Folder className="h-5 w-5 text-blue-500" />
              <span className="font-semibold text-gray-700">
                {folderPath === 'Root' ? 'Root Photos' : folderPath}
              </span>
              <span className="text-sm text-gray-500">
                ({photos.length} photo{photos.length !== 1 ? 's' : ''})
              </span>
              {isDragActive && (
                <span className="text-sm text-blue-600 ml-auto">
                  Drop photos here
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onShareFolder(folderPath, photos);
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </ContextMenuTrigger>
        
        <ContextMenuContent>
          <ContextMenuItem onClick={handleDownloadFolder}>
            <Download className="h-4 w-4 mr-2" />
            Download All
          </ContextMenuItem>
          <ContextMenuItem onClick={handleCreateLink}>
            <Link className="h-4 w-4 mr-2" />
            Create Link
          </ContextMenuItem>
          <ContextMenuItem onClick={handleShareFolder}>
            <Share className="h-4 w-4 mr-2" />
            Share
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {isExpanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 ml-6">
          {photos.map((photo) => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              isSelected={selectedPhotos.has(photo.id)}
              isDeleting={deletingPhoto === photo.id}
              onPhotoSelect={onPhotoSelect}
              onSelectionChange={onPhotoSelection}
              onDownload={onDownload}
              onShare={onShare}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
