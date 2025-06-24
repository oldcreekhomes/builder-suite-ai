
import { Folder, ChevronRight, ChevronDown } from "lucide-react";
import { PhotoCard } from "./PhotoCard";
import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

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

  return (
    <div className="space-y-4">
      <div 
        {...getRootProps()}
        className={`flex items-center space-x-2 py-2 px-4 bg-gray-50 hover:bg-gray-100 cursor-pointer rounded-lg border-2 border-dashed border-gray-300 transition-colors ${
          isDragActive ? 'bg-blue-50 border-blue-400' : ''
        }`}
        onClick={() => onToggleFolder(folderPath)}
      >
        <input {...getInputProps()} />
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
