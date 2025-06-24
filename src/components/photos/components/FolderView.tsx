
import { PhotoCard } from "./PhotoCard";
import { FolderHeader } from "./FolderHeader";
import { useFolderDragDrop } from "./hooks/useFolderDragDrop";
import { useFolderDownload } from "./utils/folderDownload";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Download, Share } from "lucide-react";

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
  const { getRootProps, getInputProps, isDragActive } = useFolderDragDrop({
    folderPath,
    projectId,
    onUploadSuccess
  });

  const { downloadFolder } = useFolderDownload();

  const handleDownloadFolder = () => {
    downloadFolder(folderPath, photos);
  };

  const handleShareFolder = () => {
    onShareFolder(folderPath, photos);
  };

  return (
    <div className="space-y-4">
      <ContextMenu>
        <ContextMenuTrigger>
          <FolderHeader
            folderPath={folderPath}
            photos={photos}
            isExpanded={isExpanded}
            isDragActive={isDragActive}
            onToggleFolder={onToggleFolder}
            getRootProps={getRootProps}
            getInputProps={getInputProps}
          />
        </ContextMenuTrigger>
        
        <ContextMenuContent>
          <ContextMenuItem onClick={handleDownloadFolder}>
            <Download className="h-4 w-4 mr-2" />
            Download All
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
